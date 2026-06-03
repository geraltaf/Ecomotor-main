import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DetectionResponse {
  smoke_detected: boolean;
  vehicle_status: string;
  confidence: number;
  evidence_image: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ComputerVisionService {
  private readonly apiBaseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  detectSmoke(file: File): Observable<DetectionResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<DetectionResponse>(`${this.apiBaseUrl}/detect`, formData);
  }

  buildEvidenceUrl(evidenceImage: string): string {
    const filename = evidenceImage.split(/[\\/]/).pop() ?? evidenceImage;
    return `${this.apiBaseUrl}/evidence/${encodeURIComponent(filename)}`;
  }
}