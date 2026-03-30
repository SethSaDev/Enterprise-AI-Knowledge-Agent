import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { AIOrchestratorService } from '../../shared/ai/services/ai-orchestrator.service';
import { RAGPipelineService } from '../../shared/ai/pipelines/rag-pipeline.service';
import { SendMessageDto, CreateConversationDto, UpdateConversationDto } from './dto';
import { MessageRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly aiOrchestrator: AIOrchestratorService,
    private readonly ragPipeline: RAGPipelineService,
  ) {}

  // ==================== CONVERSATIONS ====================

  async getConversations(
    userId: string,
    organizationId: string,
    page: number,
    limit: number,
    agentId?: string,
    isArchived?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      userId,
      organizationId,
    };

    if (agentId) {
      where.agentId = agentId;
    }

    if (isArchived !== undefined) {
      where.isArchived = isArchived;
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      data: conversations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConversation(id: string, userId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        userId,
        organizationId,
      },
      include: {
        agent: {
          include: {
            knowledgeBases: {
              include: {
                knowledgeBase: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async createConversation(
    createConversationDto: CreateConversationDto,
    userId: string,
    organizationId: string,
  ) {
    const { agentId, title, metadata } = createConversationDto;

    // Verify agent exists and belongs to organization
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        isActive: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found or inactive');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        title: title || `Conversation with ${agent.name}`,
        agentId,
        userId,
        organizationId,
        metadata: metadata || {},
        lastMessageAt: new Date(),
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`Conversation created: ${conversation.id} for user ${userId}`);

    return conversation;
  }

  async updateConversation(
    id: string,
    updateConversationDto: UpdateConversationDto,
    userId: string,
    organizationId: string,
  ) {
    await this.verifyConversationAccess(id, userId, organizationId);

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: updateConversationDto,
    });

    return updated;
  }

  async deleteConversation(id: string, userId: string, organizationId: string) {
    await this.verifyConversationAccess(id, userId, organizationId);

    await this.prisma.conversation.delete({
      where: { id },
    });

    // Clear cache
    await this.redisService.del(`conversation:${id}`);

    this.logger.log(`Conversation deleted: ${id}`);
  }

  async archiveConversation(id: string, userId: string, organizationId: string) {
    await this.verifyConversationAccess(id, userId, organizationId);

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { isArchived: true },
    });

    return updated;
  }

  async unarchiveConversation(id: string, userId: string, organizationId: string) {
    await this.verifyConversationAccess(id, userId, organizationId);

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { isArchived: false },
    });

    return updated;
  }

  // ==================== MESSAGES ====================

  async getMessages(conversationId: string, page: number, limit: number, userId: string, organizationId: string) {
    await this.verifyConversationAccess(conversationId, userId, organizationId);

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendMessage(sendMessageDto: SendMessageDto, userId: string, organizationId: string) {
    const { agentId, conversationId, message, stream = false } = sendMessageDto;

    let conversation = null;

    if (conversationId) {
      conversation = await this.verifyConversationAccess(conversationId, userId, organizationId);
    } else {
      // Create new conversation
      conversation = await this.createConversation(
        { agentId, title: undefined, metadata: {} },
        userId,
        organizationId,
      );
    }

    // Get agent
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        isActive: true,
      },
      include: {
        knowledgeBases: {
          include: {
            knowledgeBase: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found or inactive');
    }

    // Save user message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: message,
        tokens: this.estimateTokens(message),
      },
    });

    // Get conversation history for context
    const history = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Build messages for AI
    const aiMessages = this.buildAIMessages(agent, history, message);

    // Generate response using RAG if knowledge bases are attached
    let response: string;
    let citations: any[] = [];

    if (agent.knowledgeBases.length > 0) {
      const ragResult = await this.ragPipeline.query({
        agentId: agent.id,
        conversationId: conversation.id,
        query: message,
        topK: 5,
        similarityThreshold: 0.7,
        rerank: true,
      });
      response = ragResult.answer;
      citations = ragResult.sources;
    } else {
      const completion = await this.aiOrchestrator.generateCompletion(
        aiMessages,
        {
          model: agent.modelConfig.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          systemPrompt: agent.systemPrompt,
        },
        {
          organizationId,
          agentId: agent.id,
        },
      );
      response = completion.content;
    }

    // Save assistant message
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: response,
        tokens: this.estimateTokens(response),
        citations: citations.length > 0 ? citations : undefined,
      },
    });

    // Update conversation
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: 2 },
        tokenCount: { increment: (userMessage.tokens || 0) + (assistantMessage.tokens || 0) },
        lastMessageAt: new Date(),
      },
    });

    // Track usage metrics
    await this.trackUsage(organizationId, agent.id, userMessage.tokens || 0, assistantMessage.tokens || 0);

    return {
      conversationId: conversation.id,
      userMessage,
      assistantMessage,
      citations,
    };
  }

  async sendMessageStream(sendMessageDto: SendMessageDto, userId: string, organizationId: string) {
    const { agentId, conversationId, message } = sendMessageDto;

    let conversation = null;

    if (conversationId) {
      conversation = await this.verifyConversationAccess(conversationId, userId, organizationId);
    } else {
      conversation = await this.createConversation(
        { agentId, title: undefined, metadata: {} },
        userId,
        organizationId,
      );
    }

    // Get agent
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        isActive: true,
      },
      include: {
        knowledgeBases: {
          include: {
            knowledgeBase: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found or inactive');
    }

    // Save user message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: message,
        tokens: this.estimateTokens(message),
      },
    });

    // Yield user message
    yield {
      type: 'user_message',
      messageId: userMessage.id,
      content: userMessage.content,
    };

    // Get conversation history
    const history = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Build messages for AI
    const aiMessages = this.buildAIMessages(agent, history, message);

    let fullResponse = '';
    let citations: any[] = [];

    // Stream response
    if (agent.knowledgeBases.length > 0) {
      // For RAG, we need to get full response first then stream
      const ragResult = await this.ragPipeline.query({
        agentId: agent.id,
        conversationId: conversation.id,
        query: message,
        topK: 5,
        similarityThreshold: 0.7,
        rerank: true,
      });
      fullResponse = ragResult.answer;
      citations = ragResult.sources;
      
      // Stream the response in chunks
      const words = fullResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        yield {
          type: 'chunk',
          content: words[i] + (i < words.length - 1 ? ' ' : ''),
        };
        await this.delay(20); // Simulate streaming delay
      }
    } else {
      const stream = await this.aiOrchestrator.streamCompletion(
        aiMessages,
        {
          model: agent.modelConfig.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          systemPrompt: agent.systemPrompt,
        },
        {
          organizationId,
          agentId: agent.id,
        },
      );

      for await (const chunk of stream) {
        fullResponse += chunk.content;
        yield {
          type: 'chunk',
          content: chunk.content,
        };
      }
    }

    // Save assistant message
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: fullResponse,
        tokens: this.estimateTokens(fullResponse),
        citations: citations.length > 0 ? citations : undefined,
      },
    });

    // Update conversation
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: 2 },
        tokenCount: { increment: (userMessage.tokens || 0) + (assistantMessage.tokens || 0) },
        lastMessageAt: new Date(),
      },
    });

    // Track usage metrics
    await this.trackUsage(organizationId, agent.id, userMessage.tokens || 0, assistantMessage.tokens || 0);

    // Yield final message info
    yield {
      type: 'complete',
      messageId: assistantMessage.id,
      conversationId: conversation.id,
      citations,
    };
  }

  async submitFeedback(
    messageId: string,
    feedback: 'THUMBS_UP' | 'THUMBS_DOWN',
    reason: string | undefined,
    userId: string,
    organizationId: string,
  ) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          userId,
          organizationId,
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        feedback,
        feedbackReason: reason,
      },
    });

    // Track feedback for analytics
    await this.prisma.usageMetric.create({
      data: {
        organizationId,
        metricType: 'API_CALLS',
        value: 1,
        unit: 'feedback',
        metadata: { feedback, messageId },
        timestamp: new Date(),
      },
    });

    return updated;
  }

  // ==================== PRIVATE METHODS ====================

  private async verifyConversationAccess(conversationId: string, userId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        organizationId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private buildAIMessages(agent: any, history: any[], currentMessage: string): any[] {
    const messages = [];

    // Add system prompt
    if (agent.systemPrompt) {
      messages.push({
        role: 'system',
        content: agent.systemPrompt,
      });
    }

    // Add conversation history (last 10 exchanges)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === MessageRole.USER ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 4 characters per token for English
    // This is an approximation; use tiktoken in production
    return Math.ceil(text.length / 4);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async trackUsage(organizationId: string, agentId: string, promptTokens: number, completionTokens: number) {
    const totalTokens = promptTokens + completionTokens;

    await this.prisma.usageMetric.create({
      data: {
        organizationId,
        agentId,
        metricType: 'TOKENS_USED',
        value: totalTokens,
        unit: 'tokens',
        metadata: { promptTokens, completionTokens },
        timestamp: new Date(),
      },
    });

    await this.prisma.usageMetric.create({
      data: {
        organizationId,
        agentId,
        metricType: 'API_CALLS',
        value: 1,
        unit: 'request',
        timestamp: new Date(),
      },
    });
  }
}