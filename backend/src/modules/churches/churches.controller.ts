import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ChurchGuard, JwtAuthGuard } from '../../common/guards';
import type { AuthenticatedRequest } from '../../common/interfaces';
import { ChurchesService } from './churches.service';
import { ChurchResponseDto } from './dtos/church-response.dto';
import { CreateChurchDto } from './dtos/create-church.dto';
import { UpdateChurchDto } from './dtos/update-church.dto';

@Controller('churches')
@UseGuards(JwtAuthGuard)
export class ChurchesController {
  constructor(private readonly churchesService: ChurchesService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<ChurchResponseDto[]> {
    return this.churchesService.findUserChurches(req.user.id);
  }

  @Post()
  create(
    @Body() createChurchDto: CreateChurchDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ChurchResponseDto> {
    return this.churchesService.create(createChurchDto, req.user);
  }

  @Get(':churchId')
  @UseGuards(ChurchGuard)
  findOne(@Param('churchId') id: string): Promise<ChurchResponseDto> {
    return this.churchesService.findOne(id);
  }

  @Put(':churchId')
  @UseGuards(ChurchGuard)
  update(
    @Param('churchId') id: string,
    @Body() updateData: UpdateChurchDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ChurchResponseDto> {
    return this.churchesService.update(id, updateData, req.user);
  }

  @Delete(':churchId')
  remove(
    @Param('churchId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ChurchResponseDto> {
    return this.churchesService.remove(id, req.user);
  }
}
