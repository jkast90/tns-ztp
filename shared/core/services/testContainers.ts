import { BaseService } from './base';
import type { TestContainer, SpawnContainerRequest } from '../types';

export class TestContainersService extends BaseService {
  async list(): Promise<TestContainer[]> {
    return this.get<TestContainer[]>('/docker/containers');
  }

  async spawn(request: SpawnContainerRequest): Promise<TestContainer> {
    return this.post<TestContainer>('/docker/containers', request);
  }

  async remove(id: string): Promise<void> {
    await this.delete(`/docker/containers/${id}`);
  }
}
