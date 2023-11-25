import { BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { IPaginate } from "./dto.common";

export class Service<TDoc> {
    private DEFAULT_LIMIT = 10;
    private DEFAULT_PAGE = 1;

    constructor(private readonly model: Model<TDoc>) { }

    // create new
    async createOne(createDataDto: object) {
        const newData = new this.model(createDataDto);
        return await newData.save();
    }

    // create many
    async createMany(createDataDto: TDoc[]) {
        return await this.model.insertMany(createDataDto);
    }

    // find all documents
    async findAll(paginate?: IPaginate) {
        return await this.findByPaginate({}, paginate);
    }

    // find all documents by query
    async findAllByQuery(query: object) {
        return await this.model.find({ ...query, deletedAt: null });
    }

    // find one document
    async findOneById(id: Types.ObjectId) {
        return await this.model.findOne({ _id: id, deletedAt: null });
    }

    // find one document
    async findOneByQuery(query: object) {
        return await this.model.findOne({ ...query, deletedAt: null });
    }

    // search by property with case-insensitive & any character
    async searchByAnyCharacter(query: object) {
        let modifiedQuery = {};

        Object.keys(query).map(key => {
            const newValue = { $regex: query[key], $options: "si" };
            modifiedQuery[key] = newValue;
        });

        return await this.findAllByQuery({ ...modifiedQuery, deletedAt: null });
    }

    // update one document
    async updateById(id: Types.ObjectId, updateDataDto: object) {
        const data = await this.model.findByIdAndUpdate(id, updateDataDto, { new: true });

        if (!data) {
            throw new HttpException('Failed to update', HttpStatus.BAD_REQUEST);
        }

        return data;
    }

    // update one document by query
    async updateByQuery(query: object, updateDataDto: object) {
        const data = await this.model.findOneAndUpdate(query, updateDataDto, { new: true });

        return data;
    }

    // delete one by id
    async removeById(id: Types.ObjectId) {
        const data = await this.model.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date() }, { new: true });

        return data;
    }

    // delete by query
    async removeByQuery(query: object) {
        const data = await this.model.updateMany({ ...query, deletedAt: null }, { deletedAt: new Date() });

        return data;
    }

    // push item to an array of the document
    async pushItemToArrayByQuery(
        query: object,
        item: object,
    ) {
        const data = await this.model
            .findOneAndUpdate(
                query,
                {
                    $push: item,
                },
                {
                    new: true,
                },
            );

        return data;
    };

    // remove item from an array of the document
    async removeItemFromArrayByQuery(
        query: object,
        item: object,
    ) {
        const data = await this.model
            .findOneAndUpdate(
                query,
                {
                    $pull: item,
                },
                {
                    new: true,
                },
            );

        return data;
    };


    // find by paginate
    async findByPaginate(query: object = {}, paginate?: IPaginate, lookupStages: any[] = []) {
        const page = Math.abs(Number(paginate?.page || 0) || this.DEFAULT_PAGE);
        const limit = Math.abs(Number(paginate?.limit || 0) || this.DEFAULT_LIMIT);

        const data = await this.model.aggregate([
            {
                $match: { ...query, deletedAt: null }
            },
            {
                $facet: {
                    "page": [
                        {
                            $count: "totalIndex"
                        },
                        {
                            $addFields: {
                                totalPage: { $ceil: { $divide: ["$totalIndex", limit] } },
                                currentPage: page,
                                nextPage: { $cond: { if: { $gt: ["$totalPage", page] }, then: null, else: page + 1 } },
                                previousPage: { $cond: { if: { $gt: [page, 1] }, then: page - 1, else: null } },
                                startingIndex: limit * (page - 1) + 1,
                                endingIndex: limit * page,
                                itemsOnCurrentPage: { $cond: { if: { $gte: [limit, "$totalIndex"] }, then: "$totalIndex", else: limit } },
                                limit: limit,
                                sortBy: 'createdAt',
                                sortOrder: -1
                            }
                        }
                    ],
                    "data": [
                        {
                            $sort: {
                                createdAt: -1
                            }
                        },
                        {
                            $skip: limit * (page - 1)
                        },
                        {
                            $limit: limit
                        },
                        ...lookupStages,
                    ]
                }
            }
        ]);

        return {
            page: data?.[0]?.page?.[0],
            data: data?.[0]?.data
        };
    }


    // find by query filter and populate
    async findByQueryFilterAndPopulate({
        query,
        paginate,
        sort,
        lookupStages = []
    }: { query: object, paginate?: IPaginate, sort?: { sortBy: string, sortOrder: number }, lookupStages?: any[] }) {

        const page = Math.abs(Number(paginate?.page || 0) || this.DEFAULT_PAGE);
        const limit = Math.abs(Number(paginate?.limit || 0) || this.DEFAULT_LIMIT);

        // query stages
        const matchedQueries = Object.keys(query).map(key => {
            const matchedQuery = {};
            matchedQuery[key] = query[key];
            return {
                $match: { ...matchedQuery, deletedAt: null }
            }
        });

        // sort
        const sortModified = {};
        if (sort && sort.sortBy && sort.sortOrder) {
            if (!(sort.sortOrder == 1 || sort.sortOrder == -1)) {
                throw new BadRequestException('sortOrder must 1 or -1');
            }
            sortModified[sort.sortBy] = Number(sort.sortOrder);
        } else {
            sortModified['createdAt'] = -1;
        }

        const data = await this.model.aggregate([
            ...matchedQueries,
            {
                $facet: {
                    "page": [
                        {
                            $count: "totalIndex"
                        },
                        {
                            $addFields: {
                                totalPage: { $ceil: { $divide: ["$totalIndex", limit] } },
                                currentPage: page,
                                nextPage: { $cond: { if: { $gt: ["$totalPage", page] }, then: null, else: page + 1 } },
                                previousPage: { $cond: { if: { $gt: [page, 1] }, then: page - 1, else: null } },
                                startingIndex: limit * (page - 1) + 1,
                                endingIndex: limit * page,
                                itemsOnCurrentPage: { $cond: { if: { $gte: [limit, "$totalIndex"] }, then: "$totalIndex", else: limit } },
                                limit: limit,
                                sortBy: Object.keys(sortModified)[0],
                                sortOrder: sortModified[Object.keys(sortModified)[0]]
                            }
                        }
                    ],
                    "data": [
                        {
                            $sort: { ...sortModified }
                        },
                        {
                            $skip: limit * (page - 1)
                        },
                        {
                            $limit: limit
                        },
                        ...lookupStages,
                    ]
                }
            }
        ]);

        return {
            page: data?.[0]?.page?.[0],
            data: data?.[0]?.data
        };
    }
}