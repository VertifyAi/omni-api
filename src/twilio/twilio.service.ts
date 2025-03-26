import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly client: Twilio;

  constructor(private readonly configService: ConfigService) {
    this.client = new Twilio(
      this.configService.get('TWILIO_ACCOUNT_SID'),
      this.configService.get('TWILIO_AUTH_TOKEN'),
    );
  }

  async createWhatsAppNumber(phoneNumber: string) {
    try {
      // Procura por um número disponível
      const availableNumbers = await this.client.availablePhoneNumbers('BR')
        .local
        .list({
          contains: phoneNumber,
          smsEnabled: true,
        });

      if (!availableNumbers.length) {
        throw new BadRequestException('Número não disponível');
      }

      // Compra o número
      const number = await this.client.incomingPhoneNumbers
        .create({
          phoneNumber: availableNumbers[0].phoneNumber,
          smsUrl: `https://api.twilio.com/2010-04-01/Accounts/${this.configService.get('TWILIO_ACCOUNT_SID')}/Messages.json`,
        });

      return number;
    } catch (error) {
      throw new BadRequestException(`Erro ao criar número do WhatsApp: ${error.message}`);
    }
  }

  async deleteWhatsAppNumber(twilioNumberSid: string) {
    try {
      await this.client.incomingPhoneNumbers(twilioNumberSid)
        .remove();
    } catch (error) {
      throw new BadRequestException(`Erro ao deletar número do WhatsApp: ${error.message}`);
    }
  }

  async createSubAccount(companyName: string): Promise<{ sid: string; authToken: string }> {
    try {
      const subAccount = await this.client.api.accounts.create({
        friendlyName: `WhatsApp Integration - ${companyName}`,
      });

      return {
        sid: subAccount.sid,
        authToken: subAccount.authToken,
      };
    } catch (error) {
      throw new BadRequestException(`Erro ao criar subconta: ${error.message}`);
    }
  }

  async registerWhatsAppNumber(accountSid: string, authToken: string, phoneNumber: string) {
    try {
      const client = new Twilio(accountSid, authToken);
      
      // Procura por um número disponível
      const availableNumbers = await this.client.availablePhoneNumbers('BR')
        .local
        .list({
          contains: phoneNumber,
          smsEnabled: true,
        });

      if (!availableNumbers.length) {
        throw new BadRequestException('Número não disponível');
      }

      // Compra o número na subconta
      const number = await client.incomingPhoneNumbers
        .create({
          phoneNumber: availableNumbers[0].phoneNumber,
        });

      return number;
    } catch (error) {
      throw new BadRequestException(`Erro ao registrar número do WhatsApp: ${error.message}`);
    }
  }

  async configureWebhook(accountSid: string, authToken: string, webhookUrl: string) {
    try {
      const client = new Twilio(accountSid, authToken);
      
      // Configura o webhook para mensagens
      await client.messaging.v1.services(accountSid)
        .update({
          inboundRequestUrl: webhookUrl,
          inboundMethod: 'POST',
        });
    } catch (error) {
      throw new BadRequestException(`Erro ao configurar webhook: ${error.message}`);
    }
  }

  async deleteSubAccount(accountSid: string) {
    try {
      await this.client.api.accounts(accountSid)
        .update({ status: 'closed' });
    } catch (error) {
      throw new BadRequestException(`Erro ao remover subconta: ${error.message}`);
    }
  }

  async sendMessage(to: string, body: string, accountSid?: string, authToken?: string) {
    try {
      const client = accountSid && authToken
        ? new Twilio(accountSid, authToken)
        : this.client;

      const message = await client.messages.create({
        body,
        to: `whatsapp:${to}`,
        from: `whatsapp:${this.configService.get('TWILIO_WHATSAPP_NUMBER')}`,
      });

      return message;
    } catch (error) {
      throw new BadRequestException(`Erro ao enviar mensagem: ${error.message}`);
    }
  }
} 