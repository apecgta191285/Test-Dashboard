import { BadRequestException, HttpStatus } from '@nestjs/common';

export class GoogleAdsException extends BadRequestException {
    constructor(
        message: string,
        public readonly errorCode: string,
        public readonly details?: any,
    ) {
        super({
            statusCode: HttpStatus.BAD_REQUEST,
            message,
            error: errorCode,
            details,
            timestamp: new Date().toISOString(),
        });
    }
}

export class GoogleAdsAuthException extends GoogleAdsException {
    constructor(message: string, details?: any) {
        super(message, 'GOOGLE_ADS_AUTH_FAILED', details);
    }
}

export class GoogleAdsFetchException extends GoogleAdsException {
    constructor(message: string, details?: any) {
        super(message, 'GOOGLE_ADS_FETCH_FAILED', details);
    }
}

export class GoogleAdsSyncException extends GoogleAdsException {
    constructor(message: string, details?: any) {
        super(message, 'GOOGLE_ADS_SYNC_FAILED', details);
    }
}

export class GoogleAdsAccountNotFoundException extends GoogleAdsException {
    constructor(accountId: string) {
        super(
            `Google Ads account not found: ${accountId}`,
            'GOOGLE_ADS_ACCOUNT_NOT_FOUND',
            { accountId },
        );
    }
}
