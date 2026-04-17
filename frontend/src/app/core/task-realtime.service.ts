import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { TaskItem } from './models';

export interface TaskRealtimeEvent {
  type: 'task.updated' | 'task.deleted';
  data: {
    task?: TaskItem;
    taskId?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class TaskRealtimeService {
  watchTaskEvents(token: string): Observable<TaskRealtimeEvent> {
    return new Observable<TaskRealtimeEvent>((subscriber) => {
      const socket = new WebSocket(this.buildSocketUrl(token));

      socket.onmessage = (event) => {
        try {
          subscriber.next(JSON.parse(event.data) as TaskRealtimeEvent);
        } catch {
          subscriber.error(new Error('Received an invalid task event.'));
        }
      };

      socket.onerror = () => {
        subscriber.error(new Error('Task socket connection failed.'));
      };

      socket.onclose = () => {
        subscriber.complete();
      };

      return () => {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      };
    });
  }

  private buildSocketUrl(token: string): string {
    const url = new URL(environment.apiUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/tasks';
    url.search = new URLSearchParams({ token }).toString();

    return url.toString();
  }
}
