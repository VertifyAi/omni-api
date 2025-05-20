import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { VeraiService } from './verai.service';
import { ChatWithVerAiDto } from './dto/chat-with-verai.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('verai')
export class VeraiController {
  constructor(private readonly veraiService: VeraiService) {}

  @Post('chat')
  async chat(@Body() chatDto: ChatWithVerAiDto, @Req() req) {
    return await this.veraiService.chat(chatDto, req.user);
  }
} 