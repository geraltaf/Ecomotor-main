import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EcobotResponse {
  respuesta: string;
  threadId: string;
}

@Injectable({
  providedIn: 'root'
})
export class EcobotService {
  private apiUrl = 'http://localhost:3000/agente';

  constructor(private http: HttpClient) {}

  chat(mensaje: string, threadId?: string): Observable<EcobotResponse> {
    return this.http.post<EcobotResponse>(`${this.apiUrl}/chat`, {
      mensaje,
      threadId
    });
  }
}
