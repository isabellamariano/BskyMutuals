import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';
import { MeuHandle } from '../model/main.interface';

@Injectable({ providedIn: 'root' })
export class MainService {
  private http = inject(HttpClient);
  private readonly BASE_URL = 'https://public.api.bsky.app/xrpc';
  private followersCache: Set<string> = new Set();

  loadAllFollowersToCache(token: string, actor: string): Observable<Set<string>> {
    this.followersCache.clear();
    const fetchPage = (cursor?: string) => this.getFollowers(token, actor, cursor, 100);

    return fetchPage().pipe(
      expand((res) => (res.cursor ? fetchPage(res.cursor) : EMPTY)),
      map((res) => res.followers.map((f: any) => f.handle)),
      reduce((acc, handles) => {
        handles.forEach((h: string) => acc.add(h));
        return acc;
      }, this.followersCache),
    );
  }

  getFollowsWithStatus(token: string, actor: string, cursor?: string | null): Observable<any> {
    return this.getFollows(token, actor, cursor, 50).pipe(
      map((res) => {
        const onlyNotFollowingBack = res.follows.filter(
          (follow: any) => !this.followersCache.has(follow.handle),
        );
        return {
          ...res,
          follows: onlyNotFollowingBack,
        };
      }),
    );
  }

  getFollows(
    token: string,
    actor: string,
    cursor?: string | null,
    limit: number = 50,
  ): Observable<any> {
    const params = this.buildParams(actor, limit, cursor);
    return this.http.get(`${this.BASE_URL}/app.bsky.graph.getFollows`, {
      headers: this.getHeaders(token),
      params,
    });
  }

  getFollowers(
    token: string,
    actor: string,
    cursor?: string | null,
    limit: number = 50,
  ): Observable<any> {
    const params = this.buildParams(actor, limit, cursor);
    return this.http.get(`${this.BASE_URL}/app.bsky.graph.getFollowers`, {
      headers: this.getHeaders(token),
      params,
    });
  }

  getProfile(token: string, actor: string): Observable<MeuHandle> {
    const params = this.buildParams(actor);
    return this.http
      .get(`${this.BASE_URL}/app.bsky.actor.getProfile`, {
        headers: this.getHeaders(token),
        params,
      })
      .pipe(
        map((res: any) => ({
          displayName: res.displayName || res.handle,
          followersCount: res.followersCount || 0,
          followsCount: res.followsCount || 0,
          handle: res.handle,
          avatar:
            res.avatar ||
            'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
        })),
      );
  }

  private getHeaders(token: string) {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private buildParams(actor: string, limit?: number, cursor?: string | null) {
    let params = new HttpParams().set('actor', actor);
    if (limit !== undefined && limit !== null) {
      params = params.set('limit', limit.toString());
    }
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return params;
  }
}
