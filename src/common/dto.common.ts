import { IsMongoId, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";
import { Types } from "mongoose";

export class IPaginate {
    @IsOptional()
    @IsNumberString()
    limit: number;

    @IsOptional()
    @IsNumberString()
    page: number;
}

export class MongoIdParams {
    @IsNotEmpty()
    @IsMongoId()
    id: Types.ObjectId;
}