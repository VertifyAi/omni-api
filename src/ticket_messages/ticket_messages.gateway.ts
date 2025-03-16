/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SenderEnum } from './entities/ticket_message.entity';

interface MessageEvent {
  ticketId: number;
  message: string;
  sender: SenderEnum;
  createdAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Permite todas as origens
    methods: ['GET', 'POST'],
    credentials: true
  }
})
export class TicketMessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  notifyNewMessage(data: MessageEvent) {
    this.server.emit('new_message', data);
  }
}
