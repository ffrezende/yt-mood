import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Validation guard for additional request validation
 * Can be extended for custom validation logic
 */
@Injectable()
export class ValidationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Additional validation logic can be added here
    return true;
  }
}

