import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SendMessageDto, CreateConversationDto, UpdateConversationDto } from './dto';
import { Observable, interval, map } from 'rxjs';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== CONVERSATIONS ====================

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'agentId', required: false, type: String })
  @ApiQuery({ name: 'isArchived', required: false, type: Boolean })
  async getConversations(
    @CurrentUser() user,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('agentId') agentId?: string,
    @Query('isArchived') isArchived?: boolean,
  ) {
    return this.chatService.getConversations(
      user.id,
      user.organizationId,
      +page,
      +limit,
      agentId,
      isArchived,
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  async getConversation(@Param('id') id: string, @CurrentUser() user) {
    return this.chatService.getConversation(id, user.id, user.organizationId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create new conversation' })
  async createConversation(@Body() createConversationDto: CreateConversationDto, @CurrentUser() user) {
    return this.chatService.createConversation(
      createConversationDto,
      user.id,
      user.organizationId,
    );
  }

  @Put('conversations/:id')
  @ApiOperation({ summary: 'Update conversation' })
  async updateConversation(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @CurrentUser() user,
  ) {
    return this.chatService.updateConversation(id, updateConversationDto, user.id, user.organizationId);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete conversation' })
  async deleteConversation(@Param('id') id: string, @CurrentUser() user) {
    await this.chatService.deleteConversation(id, user.id, user.organizationId);
  }

  @Post('conversations/:id/archive')
  @ApiOperation({ summary: 'Archive conversation' })
  async archiveConversation(@Param('id') id: string, @CurrentUser() user) {
    return this.chatService.archiveConversation(id, user.id, user.organizationId);
  }

  @Post('conversations/:id/unarchive')
  @ApiOperation({ summary: 'Unarchive conversation' })
  async unarchiveConversation(@Param('id') id: string, @CurrentUser() user) {
    return this.chatService.unarchiveConversation(id, user.id, user.organizationId);
  }

  // ==================== MESSAGES ====================

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @CurrentUser() user,
  ) {
    return this.chatService.getMessages(id, +page, +limit, user.id, user.organizationId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send message (non-streaming)' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @CurrentUser() user) {
    return this.chatService.sendMessage(
      sendMessageDto,
      user.id,
      user.organizationId,
    );
  }

  @Post('send-stream')
  @ApiOperation({ summary: 'Send message with streaming response' })
  async sendMessageStream(
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser() user,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const stream = await this.chatService.sendMessageStream(
        sendMessageDto,
        user.id,
        user.organizationId,
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  @Post('messages/:id/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit feedback for a message' })
  async submitFeedback(
    @Param('id') id: string,
    @Body('feedback') feedback: 'THUMBS_UP' | 'THUMBS_DOWN',
    @Body('reason') reason?: string,
    @CurrentUser() user,
  ) {
    return this.chatService.submitFeedback(id, feedback, reason, user.id, user.organizationId);
  }

  // ==================== SSE STREAM ====================

  @Sse('stream/:conversationId')
  @ApiOperation({ summary: 'SSE stream for conversation' })
  streamConversation(@Param('conversationId') conversationId: string): Observable<MessageEvent> {
    return interval(1000).pipe(
      map(() => ({
        data: { timestamp: new Date(), conversationId },
      } as MessageEvent)),
    );
  }
}