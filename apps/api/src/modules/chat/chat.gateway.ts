import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { SendMessageDto } from './dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, { userId: string; organizationId: string }>();

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      // Verify JWT token (simplified - use actual JWT verification)
      const payload = this.verifyToken(token);
      this.connectedClients.set(client.id, {
        userId: payload.sub,
        organizationId: payload.orgId,
      });
      
      client.join(`user:${payload.sub}`);
      client.join(`org:${payload.orgId}`);
      
      console.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      throw new WsException('Unauthorized');
    }

    try {
      // Send typing indicator
      client.to(`conversation:${data.conversationId}`).emit('typing', {
        userId: clientInfo.userId,
        isTyping: true,
      });

      // Process message with streaming
      const stream = await this.chatService.sendMessageStream(
        data,
        clientInfo.userId,
        clientInfo.organizationId,
      );

      let messageId = null;
      let fullContent = '';

      for await (const chunk of stream) {
        if (chunk.type === 'chunk') {
          fullContent += chunk.content;
          client.emit('message_chunk', {
            conversationId: data.conversationId,
            content: chunk.content,
            isStreaming: true,
          });
        } else if (chunk.type === 'complete') {
          messageId = chunk.messageId;
          client.emit('message_complete', {
            conversationId: data.conversationId,
            messageId: chunk.messageId,
            content: fullContent,
            citations: chunk.citations,
          });
        }
      }

      // Stop typing indicator
      client.to(`conversation:${data.conversationId}`).emit('typing', {
        userId: clientInfo.userId,
        isTyping: false,
      });

      // Broadcast new message to all participants
      this.server.to(`conversation:${data.conversationId}`).emit('new_message', {
        conversationId: data.conversationId,
        messageId,
        content: fullContent,
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    client.join(`conversation:${conversationId}`);
    client.emit('joined_conversation', { conversationId });
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    client.leave(`conversation:${conversationId}`);
    client.emit('left_conversation', { conversationId });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      client.to(`conversation:${data.conversationId}`).emit('typing', {
        userId: clientInfo.userId,
        isTyping: data.isTyping,
      });
    }
  }

  private verifyToken(token: string): any {
    // Simplified - use actual JWT verification
    const jwt = require('jsonwebtoken');
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}