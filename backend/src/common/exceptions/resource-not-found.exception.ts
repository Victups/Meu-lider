import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { RESOURCE_NOT_FOUND_MESSAGES, ResourceType } from '../constants/resource.constant';
import { DomainException } from './domain.exception';

export class ResourceNotFoundException extends DomainException {
  constructor(resource: ResourceType, resourceId?: string) {
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      RESOURCE_NOT_FOUND_MESSAGES[resource],
      HttpStatus.NOT_FOUND,
      { resource, resourceId },
    );
  }
}
