import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ConnectGoogleAdsDto {
  @ApiProperty({ example: 'your-client-id' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 'your-client-secret' })
  @IsString()
  clientSecret: string;

  @ApiProperty({ example: 'your-developer-token' })
  @IsString()
  developerToken: string;

  @ApiProperty({ example: 'your-refresh-token', required: false })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;
}

