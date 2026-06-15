import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcobotService } from '../services/ecobot.service';

@Component({
  selector: 'app-ecobot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecobot.component.html',
  styleUrls: ['./ecobot.component.css']
})
export class EcobotComponent {
  @Input() vehiculo: any | null = null;

  mensajes: Array<{ sender: 'user' | 'bot'; texto: string; fecha: string }> = [];
  mensajeEntrada = '';
  cargando = false;
  threadId: string | null = null;
  errorTexto = '';

  constructor(private ecobotService: EcobotService) {}

  enviarMensaje(): void {
    const texto = this.mensajeEntrada.trim();
    if (!texto) {
      return;
    }

    this.errorTexto = '';
    this.agregarMensaje('user', texto);
    this.mensajeEntrada = '';
    this.cargando = true;

    this.ecobotService.chat(texto, this.threadId || undefined).subscribe({
      next: (data) => {
        this.threadId = data.threadId;
        this.agregarMensaje('bot', data.respuesta);
        this.cargando = false;
        setTimeout(() => this.scrollToEnd(), 50);
      },
      error: (err) => {
        console.error('Error EcoBot:', err);
        const detalle = err?.error?.error || err?.message;
        this.errorTexto = detalle
          ? `No se pudo conectar con EcoBot: ${detalle}`
          : 'No se pudo conectar con EcoBot. Intenta de nuevo mas tarde.';
        this.cargando = false;
      }
    });
  }

  agregarMensaje(sender: 'user' | 'bot', texto: string): void {
    this.mensajes.push({
      sender,
      texto,
      fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  limpiarChat(): void {
    this.mensajes = [];
    this.threadId = null;
    this.errorTexto = '';
  }

  scrollToEnd(): void {
    const lista = document.getElementById('ecobot-messages');
    if (lista) {
      lista.scrollTop = lista.scrollHeight;
    }
  }
}
