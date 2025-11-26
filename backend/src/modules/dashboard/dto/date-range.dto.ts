import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DateRangeDto {
  @ApiProperty({ 
    example: '2024-01-01',
    description: 'Start date (ISO format)',
    required: false
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ 
    example: '2024-12-31',
    description: 'End date (ISO format)',
    required: false
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

