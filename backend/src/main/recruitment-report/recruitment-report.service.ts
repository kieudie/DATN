import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { Response } from "express";
import { Brackets, DataSource, SelectQueryBuilder } from "typeorm";
import {
  RECRUITMENT_PIPELINE_CODES,
  RecruitmentOrderStatus,
} from "../../common/constants/recruitment.constants";
import { LoggerService } from "../../common/logger/logger.service";
import { QueryReportByPositionDTO } from "./dto/query-report-by-position.dto";
import { QueryReportOverviewDTO } from "./dto/query-report-overview.dto";

@Injectable()
export class RecruitmentReportService {
  private readonly logger = new LoggerService("RecruitmentReportService");

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Bộ lọc ngày cho các report pipeline.
   *
   * Quy ước tính mới:
   *   - start_date/end_date dùng để lọc thời điểm ứng viên đi vào từng bước pipeline,
   *     tức là recruitment_candidate_pipeline.start_time.
   *   - Không dùng app.applied_date cho các thống kê pipeline trong các report này.
   *   - end_date thường được truyền dạng YYYY-MM-DD, còn start_time là DATETIME,
   *     nên dùng "< DATE_ADD(:end, INTERVAL 1 DAY)" để lấy đủ toàn bộ ngày end_date.
   */
  private applyPipelineStartTimeRange(
    condition: string,
    params: Record<string, any>,
    alias: string,
    prefix: string,
    startDate?: string,
    endDate?: string,
  ) {
    if (startDate) {
      condition += ` AND ${alias}.start_time >= :${prefix}_start_date`;
      params[`${prefix}_start_date`] = startDate;
    }

    if (endDate) {
      condition += ` AND ${alias}.start_time < DATE_ADD(:${prefix}_end_date, INTERVAL 1 DAY)`;
      params[`${prefix}_end_date`] = endDate;
    }

    return condition;
  }

  private applyOverviewCommonFilters(
    qb: SelectQueryBuilder<any>,
    query: QueryReportOverviewDTO,
    usePipelineStartTime: boolean,
  ) {
    const { start_date, end_date, position, level, department } = query;

    if (start_date) {
      if (usePipelineStartTime) {
        qb.andWhere("cp.start_time >= :start_date", { start_date });
      } else {
        qb.andWhere("app.applied_date >= :start_date", { start_date });
      }
    }

    if (end_date) {
      if (usePipelineStartTime) {
        qb.andWhere("cp.start_time < DATE_ADD(:end_date, INTERVAL 1 DAY)", {
          end_date,
        });
      } else {
        qb.andWhere("app.applied_date <= :end_date", { end_date });
      }
    }

    if (position) {
      const searchPos = position.trim().toLowerCase();

      qb.andWhere(
        new Brackets((orQb) => {
          orQb
            .where(
              `app.position REGEXP '^[0-9]+$' 
             AND EXISTS (
                SELECT 1 FROM recruitment_orders ro2 
                WHERE ro2.id = CAST(app.position AS UNSIGNED) 
                AND LOWER(TRIM(ro2.position)) = :searchPos 
                AND ro2.deleted_at IS NULL
             )`,
              { searchPos },
            )
            .orWhere(
              `NOT app.position REGEXP '^[0-9]+$' 
             AND LOWER(TRIM(app.position)) = :searchPos`,
              { searchPos },
            );
        }),
      );
    }

    if (level) {
      qb.andWhere("app.level = :level", { level });
    }

    if (department) {
      qb.andWhere("FIND_IN_SET(:department, app.department) > 0", {
        department,
      });
    }

    return qb;
  }

  private async buildOverviewResult(
    query: QueryReportOverviewDTO,
    usePipelineStartTime: boolean,
    res: Response,
  ) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select(
        "COALESCE(cp.recruitment_pipeline_code, app.status)",
        "pipelineCode",
      )
      .addSelect("COUNT(DISTINCT app.id)", "count")
      .from("applications", "app")
      .leftJoin(
        "candidate_pipeline",
        "cp",
        "cp.application_id = app.id",
      )
      .leftJoin(
        "recruitment_orders",
        "ro",
        "app.position REGEXP '^[0-9]+$' AND ro.id = CAST(app.position AS UNSIGNED) AND ro.deleted_at IS NULL",
      )
      .where("app.deleted_at IS NULL");

    this.applyOverviewCommonFilters(qb, query, usePipelineStartTime);

    qb.groupBy("COALESCE(cp.recruitment_pipeline_code, app.status)").orderBy(
      "COALESCE(cp.recruitment_pipeline_code, app.status)",
      "ASC",
    );

    const rows: { pipelineCode: string; count: string }[] =
      await qb.getRawMany();

    const countMap: Record<string, number> = {};
    rows.forEach((r) => {
      countMap[r.pipelineCode] = Number(r.count);
    });

    const interviewQb = this.dataSource
      .createQueryBuilder()
      .select("COUNT(DISTINCT app.id)", "count")
      .from("applications", "app")
      .innerJoin(
        "candidate_pipeline",
        "cp",
        `cp.application_id = app.id AND cp.recruitment_pipeline_code IN ('${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1}', '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_2}')`,
      )
      .leftJoin(
        "recruitment_orders",
        "ro",
        "app.position REGEXP '^[0-9]+$' AND ro.id = CAST(app.position AS UNSIGNED) AND ro.deleted_at IS NULL",
      )
      .where("app.deleted_at IS NULL");

    this.applyOverviewCommonFilters(interviewQb, query, usePipelineStartTime);

    const interviewRow = await interviewQb.getRawOne();
    const interviewCount = Number(interviewRow?.count ?? 0);

    const result = Object.entries(RECRUITMENT_PIPELINE_CODES).map(
      ([, code]) => ({
        pipelineCode: code,
        count: countMap[code] ?? 0,
      }),
    );

    result.push({ pipelineCode: "interview" as any, count: interviewCount });

    return res.status(HttpStatus.OK).json({
      code: HttpStatus.OK,
      message: "Success",
      data: result,
    });
  }

  async getOverview(query: QueryReportOverviewDTO, res: Response) {
    try {
      return await this.buildOverviewResult(query, false, res);
    } catch (error) {
      this.logger.error("Error in getOverview:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  async getOverviewRealtime(query: QueryReportOverviewDTO, res: Response) {
    try {
      return await this.buildOverviewResult(query, true, res);
    } catch (error) {
      this.logger.error("Error in getOverviewRealtime:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  async getByPosition(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      let appJoinCondition = `
      app.deleted_at IS NULL AND (
        (
          app.position REGEXP '^[0-9]+$'
          AND CAST(app.position AS UNSIGNED) = ro.id
        )
        OR (
          app.position NOT REGEXP '^[0-9]+$'
          AND LOWER(TRIM(app.position)) = LOWER(TRIM(ro.position))
        )
      )
    `;
      const appJoinParams: Record<string, any> = {};

      // ============================================================
      // Lọc dữ liệu thống kê getByPosition theo pipeline.start_time
      //
      // Yêu cầu mới:
      //   - start_date/end_date KHÔNG còn lọc app.applied_date.
      //   - Thống kê chỉ lấy các bản ghi trong
      //     candidate_pipeline có start_time nằm trong khoảng lọc.
      //
      // Cách hiểu từng chỉ số:
      //   - received_cv/hr_scan/test/.../onboarding bên dưới đếm DISTINCT app.id
      //     theo từng recruitment_pipeline_code trên các dòng cp hợp lệ.
      //   - Nếu một application có nhiều dòng cùng pipeline_code trong khoảng ngày,
      //     vẫn chỉ tính 1 lần nhờ COUNT(DISTINCT app.id).
      //
      // Lưu ý end_date:
      //   - start_time là DATETIME còn input thường là YYYY-MM-DD.
      //   - Dùng "< DATE_ADD(:end_date, INTERVAL 1 DAY)" để bao trọn cả ngày end_date
      //     thay vì chỉ lấy đúng thời điểm 00:00:00 của ngày đó.
      // ============================================================
      let pipelineJoinCondition = "cp.application_id = app.id";
      const pipelineJoinParams: Record<string, any> = {};

      if (start_date) {
        pipelineJoinCondition += " AND cp.start_time >= :pipeline_start_date";
        pipelineJoinParams.pipeline_start_date = start_date;
      }

      if (end_date) {
        pipelineJoinCondition +=
          " AND cp.start_time < DATE_ADD(:pipeline_end_date, INTERVAL 1 DAY)";
        pipelineJoinParams.pipeline_end_date = end_date;
      }

      const qb = this.dataSource
        .createQueryBuilder()

        .select("ro.position", "positionName")

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.RECEIVED_CV}' THEN app.id END)`,
          "ungTuyen",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.HR_SCAN}' THEN app.id END)`,
          "hrChon",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code IN ('${RECRUITMENT_PIPELINE_CODES.IQ_TEST}', '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}') THEN app.id END)`,
          "test",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.IQ_TEST}' THEN app.id END)`,
          "iqTest",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}' THEN app.id END)`,
          "technicalTest",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW}' THEN app.id END)`,
          "boPhanChon",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1}' THEN app.id END)`,
          "pvVong1",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_2}' THEN app.id END)`,
          "pvVong2",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.OFFER}' THEN app.id END)`,
          "offer",
        )

        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}' THEN app.id END)`,
          "diLam",
        )

        .from("recruitment_orders", "ro")

        .leftJoin(
          "applications",
          "app",
          appJoinCondition,
          appJoinParams,
        )

        // Join toàn bộ pipeline entries (không chỉ entry mới nhất)
        // → mỗi ứng viên được đếm cho MỌI bước họ đã đi qua trong khoảng start_time.
        .leftJoin(
          "candidate_pipeline",
          "cp",
          pipelineJoinCondition,
          pipelineJoinParams,
        )

        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :cancelledStatus", {
          cancelledStatus: RecruitmentOrderStatus.CANCELLED,
        })

        .groupBy("ro.position")
        .orderBy("ro.position", "ASC");

      const rows = await qb.getRawMany();

      // ============================================================
      // Tính success_rate theo vị trí tuyển dụng
      //
      // Logic:
      //   - Mỗi order có position (ví dụ "AI Engineer") và quantity (số lượng cần tuyển)
      //   - onboarded_count KHÔNG dựa vào app.applied_date.
      //   - onboarded_count = số DISTINCT app.id có bản ghi pipeline ONBOARDING
      //     và cp.start_time nằm trong khoảng start_date/end_date truyền vào.
      //   - success_rate của position P = SUM(onboarded_count) / SUM(quantity) * 100
      //     qua tất cả order không bị cancel có cùng position P.
      //
      // Ví dụ:
      //   - Position "AI Engineer" có 2 order, quantity lần lượt 3 và 2.
      //   - Trong khoảng ngày lọc, pipeline ONBOARDING có 1 ứng viên thuộc order 1
      //     và 2 ứng viên thuộc order 2.
      //   - success_rate = (1 + 2) / (3 + 2) * 100 = 60%.
      //
      // Triển khai 2 queries SQL + tính trong TypeScript:
      //   Bước 1: Lấy tất cả order không bị cancel, có position và quantity hợp lệ
      //   Bước 2: Lấy số ứng viên có pipeline ONBOARDING trong khoảng cp.start_time,
      //           group theo order_id
      //   Bước 3: Group theo position, tính SUM(onboarded) / SUM(quantity) * 100
      // ============================================================

      // Bước 1: Lấy các order không bị cancel, có quantity
      const posOrders = await this.dataSource
        .createQueryBuilder()
        .select("ro.id", "orderId")
        .addSelect("ro.position", "position")
        .addSelect("ro.quantity", "quantity")
        .from("recruitment_orders", "ro")
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :posCs1", {
          posCs1: RecruitmentOrderStatus.CANCELLED,
        })
        .andWhere("ro.quantity IS NOT NULL")
        .andWhere("ro.quantity != ''")
        .getRawMany();

      // Bước 2: Số ứng viên đã onboard per order
      let posOnboardedJoinCond = `
        app.deleted_at IS NULL
        AND (
          (app.position REGEXP '^[0-9]+$' AND CAST(app.position AS UNSIGNED) = ro.id)
          OR (app.position NOT REGEXP '^[0-9]+$' AND LOWER(TRIM(app.position)) = LOWER(TRIM(ro.position)))
        )
      `;
      const posOnboardedParams: Record<string, any> = {};
      let posOnboardedPipelineCond = `
        cp.application_id = app.id
        AND cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}'
      `;
      if (start_date) {
        posOnboardedPipelineCond += " AND cp.start_time >= :pos_ob_start";
        posOnboardedParams.pos_ob_start = start_date;
      }
      if (end_date) {
        posOnboardedPipelineCond +=
          " AND cp.start_time < DATE_ADD(:pos_ob_end, INTERVAL 1 DAY)";
        posOnboardedParams.pos_ob_end = end_date;
      }

      const posOnboardedRows = await this.dataSource
        .createQueryBuilder()
        .select("ro.id", "orderId")
        .addSelect("COUNT(DISTINCT app.id)", "onboardedCount")
        .from("recruitment_orders", "ro")
        .innerJoin(
          "applications",
          "app",
          posOnboardedJoinCond,
          posOnboardedParams,
        )
        .innerJoin(
          "candidate_pipeline",
          "cp",
          posOnboardedPipelineCond,
          posOnboardedParams,
        )
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :posCs2", {
          posCs2: RecruitmentOrderStatus.CANCELLED,
        })
        .groupBy("ro.id")
        .getRawMany();

      // Bước 3: Tính success_rate trong TypeScript
      // Build map: orderId → onboardedCount
      const posOnboardedMap = new Map<number, number>();
      for (const r of posOnboardedRows) {
        posOnboardedMap.set(Number(r.orderId), Number(r.onboardedCount));
      }

      // Group theo position, tính per-order rate cho từng order trong mỗi position
      type PosOrderRateDetail = {
        order_id: number;
        quantity: number;
        onboarded: number;
        rate: number; // onboarded / quantity (dạng số thực, chưa nhân 100)
      };
      const ratesByPosition: Record<string, PosOrderRateDetail[]> = {};
      for (const order of posOrders) {
        const qty = parseInt(order.quantity, 10);
        if (!qty || qty <= 0) continue;
        const posKey = (order.position ?? "").trim();
        if (!ratesByPosition[posKey]) ratesByPosition[posKey] = [];
        const onboarded = posOnboardedMap.get(Number(order.orderId)) ?? 0;
        ratesByPosition[posKey].push({
          order_id: Number(order.orderId),
          quantity: qty,
          onboarded,
          rate: onboarded / qty,
        });
      }

      // success_rate (%) = onboarding / SUM(quantity) * 100, làm tròn 1 chữ số thập phân
      const posSuccessRateMap: Record<string, number> = {};
      const posTotalsMap: Record<
        string,
        { total_onboarded: number; total_quantity: number }
      > = {};
      for (const [pos, details] of Object.entries(ratesByPosition)) {
        const totalQuantity = details.reduce((a, d) => a + d.quantity, 0);
        const onboardingCount = Number(
          rows.find((r) => r.positionName?.trim() === pos)?.diLam ?? 0,
        );
        posSuccessRateMap[pos] =
          totalQuantity > 0
            ? Math.round((onboardingCount / totalQuantity) * 1000) / 10
            : 0;
        posTotalsMap[pos] = {
          total_onboarded: onboardingCount,
          total_quantity: totalQuantity,
        };
      }

      const result = rows.map((r) => {
        const posKey = (r.positionName ?? "").trim();
        const details = ratesByPosition[posKey] ?? [];
        const totals = posTotalsMap[posKey] ?? {
          total_onboarded: 0,
          total_quantity: 0,
        };
        return {
          position_name: r.positionName,
          received_cv: Number(r.ungTuyen),
          hr_scan: Number(r.hrChon),
          test: Number(r.test),
          iq_test: Number(r.iqTest),
          technical_test: Number(r.technicalTest),
          department_review: Number(r.boPhanChon),
          interview_round_1: Number(r.pvVong1),
          interview_round_2: Number(r.pvVong2),
          offer: Number(r.offer),
          onboarding: Number(r.diLam),
          success_rate: posSuccessRateMap[posKey] ?? 0, // % = onboarding/SUM(quantity) * 100
          // Chi tiết từng order đóng góp vào success_rate để dễ verify công thức:
          // success_rate = onboarding trên tất cả order chứa position này
          //              / SUM(quantity trên tất cả order chứa position này) * 100
          success_rate_detail: {
            total_onboarded: totals.total_onboarded,
            total_quantity: totals.total_quantity,
            orders: details.map((d) => ({
              order_id: d.order_id,
              quantity: d.quantity,
              onboarded: d.onboarded,
            })),
          },
        };
      });

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getByPosition:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  async getByLevel(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      let levelPipelineJoinCondition = "cp.application_id = app.id";
      const levelPipelineJoinParams: Record<string, any> = {};
      levelPipelineJoinCondition = this.applyPipelineStartTimeRange(
        levelPipelineJoinCondition,
        levelPipelineJoinParams,
        "cp",
        "level_pipeline",
        start_date,
        end_date,
      );

      // ============================================================
      // Query 1: Thống kê pipeline theo level (group by app.level)
      //
      // start_date/end_date lọc theo cp.start_time của từng pipeline entry:
      //   - một ứng viên chỉ được tính vào một bước nếu dòng pipeline của bước đó
      //     có start_time nằm trong khoảng ngày truyền vào.
      //   - COUNT(DISTINCT app.id) tránh đếm trùng nếu ứng viên có nhiều dòng cùng bước.
      // ============================================================
      const qb = this.dataSource
        .createQueryBuilder()
        .select("app.level", "level")
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.RECEIVED_CV}' THEN app.id END)`,
          "ungTuyen",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.HR_SCAN}' THEN app.id END)`,
          "hrChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code IN ('${RECRUITMENT_PIPELINE_CODES.IQ_TEST}', '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}') THEN app.id END)`,
          "test",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.IQ_TEST}' THEN app.id END)`,
          "iqTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}' THEN app.id END)`,
          "technicalTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW}' THEN app.id END)`,
          "boPhanChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1}' THEN app.id END)`,
          "pvVong1",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_2}' THEN app.id END)`,
          "pvVong2",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.OFFER}' THEN app.id END)`,
          "offer",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}' THEN app.id END)`,
          "diLam",
        )
        .from("applications", "app")
        // Join toàn bộ pipeline entries (không chỉ entry mới nhất)
        // → mỗi ứng viên được đếm cho MỌI bước họ đã đi qua
        .leftJoin(
          "candidate_pipeline",
          "cp",
          levelPipelineJoinCondition,
          levelPipelineJoinParams,
        )
        .where("app.deleted_at IS NULL")
        .andWhere("app.level IS NOT NULL");

      qb.groupBy("app.level").orderBy("app.level", "ASC");

      const rows = await qb.getRawMany();

      // ============================================================
      // Tính success_rate per level
      //
      // Công thức:
      //   success_rate(level L) = SUM(onboarded của các order chứa L) / SUM(quantity của các order chứa L)
      //
      // Trong đó:
      //   - onboarded = số DISTINCT app.id có pipeline ONBOARDING
      //     và cp.start_time nằm trong khoảng start_date/end_date.
      //   - Không lọc theo app.applied_date.
      //
      // Ví dụ:
      //   Order 1: hr_level="intern, fresher, junior", quantity=5 → intern=1, fresher=2, junior=2
      //   Order 2: hr_level="intern, fresher",         quantity=3 → intern=0, fresher=3
      //   → intern  = (1+0)/(5+3) = 12.5%
      //   → fresher = (2+3)/(5+3) = 62.5%
      //   → junior  = 2/5         = 40%
      //
      // Lưu ý: denominator = SUM(quantity của TẤT CẢ order có chứa level đó trong hr_level CSV)
      //
      // Triển khai 2 queries SQL + tính trong TypeScript:
      //   Bước 1: Lấy tất cả order có hr_level và quantity hợp lệ
      //   Bước 2: Lấy số ứng viên đã onboard, group theo (order_id, level)
      //   Bước 3: Tách CSV hr_level, tính SUM(onboarded)/SUM(quantity) theo level
      // ============================================================

      // Bước 1: Lấy các order không bị cancel, có hr_level và quantity
      const orders = await this.dataSource
        .createQueryBuilder()
        .select("ro.id", "orderId")
        .addSelect("ro.hr_level", "hrLevel")
        .addSelect("ro.quantity", "quantity")
        .addSelect("ro.position", "position")
        .from("recruitment_orders", "ro")
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :cs1", {
          cs1: RecruitmentOrderStatus.CANCELLED,
        })
        .andWhere("ro.hr_level IS NOT NULL")
        .andWhere("ro.hr_level != ''")
        .andWhere("ro.quantity IS NOT NULL")
        .andWhere("ro.quantity != ''")
        .getRawMany();

      // Bước 2: Số ứng viên đã onboard, group theo (order_id, level)
      // JOIN application → order qua app.position (numeric ID hoặc tên vị trí)
      let onboardedJoinCond = `
        app.deleted_at IS NULL
        AND app.level IS NOT NULL
        AND (
          (app.position REGEXP '^[0-9]+$' AND CAST(app.position AS UNSIGNED) = ro.id)
          OR (app.position NOT REGEXP '^[0-9]+$' AND LOWER(TRIM(app.position)) = LOWER(TRIM(ro.position)))
        )
      `;
      const onboardedParams: Record<string, any> = {};
      let onboardedPipelineCond = `
        cp.application_id = app.id
        AND cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}'
      `;
      onboardedPipelineCond = this.applyPipelineStartTimeRange(
        onboardedPipelineCond,
        onboardedParams,
        "cp",
        "level_ob",
        start_date,
        end_date,
      );

      const onboardedRows = await this.dataSource
        .createQueryBuilder()
        .select("ro.id", "orderId")
        .addSelect("LOWER(TRIM(app.level))", "level")
        .addSelect("COUNT(DISTINCT app.id)", "onboardedCount")
        .from("recruitment_orders", "ro")
        .innerJoin(
          "applications",
          "app",
          onboardedJoinCond,
          onboardedParams,
        )
        .innerJoin(
          "candidate_pipeline",
          "cp",
          onboardedPipelineCond,
          onboardedParams,
        )
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :cs2", {
          cs2: RecruitmentOrderStatus.CANCELLED,
        })
        .groupBy("ro.id")
        .addGroupBy("LOWER(TRIM(app.level))")
        .getRawMany();

      // Bước 3: Tính success_rate trong TypeScript
      // Build map: `${orderId}_${level}` → onboardedCount
      const onboardedMap = new Map<string, number>();
      for (const r of onboardedRows) {
        onboardedMap.set(`${r.orderId}_${r.level}`, Number(r.onboardedCount));
      }

      // Tách hr_level CSV, tính per-order rate cho từng level trong mỗi order
      // Lưu đủ thông tin chi tiết để trả về cho client tự verify công thức
      type OrderRateDetail = {
        order_id: number;
        position: string;
        hr_level: string; // toàn bộ giá trị hr_level CSV của order đó
        quantity: number;
        onboarded: number;
        rate: number; // onboarded / quantity (dạng số thực, chưa nhân 100)
      };
      const ratesByLevel: Record<string, OrderRateDetail[]> = {};
      for (const order of orders) {
        const qty = parseInt(order.quantity, 10);
        if (!qty || qty <= 0) continue;
        const levels = (order.hrLevel as string)
          .split(",")
          .map((l: string) => l.trim().toLowerCase())
          .filter(Boolean);
        for (const level of levels) {
          const onboarded = onboardedMap.get(`${order.orderId}_${level}`) ?? 0;
          if (!ratesByLevel[level]) ratesByLevel[level] = [];
          ratesByLevel[level].push({
            order_id: Number(order.orderId),
            position: order.position ?? "",
            hr_level: order.hrLevel ?? "",
            quantity: qty,
            onboarded,
            rate: onboarded / qty,
          });
        }
      }

      // success_rate (%) = onboarding / SUM(quantity) * 100, làm tròn 1 chữ số thập phân
      const successRateMap: Record<string, number> = {};
      const levelTotalsMap: Record<
        string,
        { total_onboarded: number; total_quantity: number }
      > = {};
      for (const [level, details] of Object.entries(ratesByLevel)) {
        const totalQuantity = details.reduce((a, d) => a + d.quantity, 0);
        const onboardingCount = Number(
          rows.find((r) => r.level?.toLowerCase()?.trim() === level)?.diLam ??
            0,
        );
        successRateMap[level] =
          totalQuantity > 0
            ? Math.round((onboardingCount / totalQuantity) * 1000) / 10
            : 0;
        levelTotalsMap[level] = {
          total_onboarded: onboardingCount,
          total_quantity: totalQuantity,
        };
      }

      const result = rows.map((r) => {
        const levelKey = r.level?.toLowerCase()?.trim();
        const details = ratesByLevel[levelKey] ?? [];
        const totals = levelTotalsMap[levelKey] ?? {
          total_onboarded: 0,
          total_quantity: 0,
        };
        return {
          level: r.level,
          received_cv: Number(r.ungTuyen),
          hr_scan: Number(r.hrChon),
          test: Number(r.test),
          iq_test: Number(r.iqTest),
          technical_test: Number(r.technicalTest),
          department_review: Number(r.boPhanChon),
          interview_round_1: Number(r.pvVong1),
          interview_round_2: Number(r.pvVong2),
          offer: Number(r.offer),
          onboarding: Number(r.diLam),
          success_rate: successRateMap[levelKey] ?? 0, // % = onboarding/SUM(quantity) * 100
          // Chi tiết từng order đóng góp vào success_rate để dễ verify công thức:
          // success_rate = onboarding trên tất cả order chứa level này
          //              / SUM(quantity trên tất cả order chứa level này) * 100
          success_rate_detail: {
            total_onboarded: totals.total_onboarded,
            total_quantity: totals.total_quantity,
            orders: details.map((d) => ({
              order_id: d.order_id,
              position: d.position,
              hr_level: d.hr_level,
              quantity: d.quantity,
              onboarded: d.onboarded,
            })),
          },
        };
      });

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getByLevel:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  async getByDepartment(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      // Điều kiện JOIN application: app.department chứa tên phòng ban (có thể là CSV)
      // Dùng FIND_IN_SET để match đúng từng phần tử trong chuỗi CSV
      let appJoinCondition = `
        app.deleted_at IS NULL
        AND FIND_IN_SET(TRIM(rm.department_name), REPLACE(app.department, ', ', ',')) > 0
      `;
      const appJoinParams: Record<string, any> = {};

      let deptPipelineJoinCondition = "cp.application_id = app.id";
      const deptPipelineJoinParams: Record<string, any> = {};
      deptPipelineJoinCondition = this.applyPipelineStartTimeRange(
        deptPipelineJoinCondition,
        deptPipelineJoinParams,
        "cp",
        "dept_pipeline",
        start_date,
        end_date,
      );

      const qb = this.dataSource
        .createQueryBuilder()
        .select("rm.department_name", "departmentName")
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.RECEIVED_CV}' THEN app.id END)`,
          "ungTuyen",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.HR_SCAN}' THEN app.id END)`,
          "hrChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code IN ('${RECRUITMENT_PIPELINE_CODES.IQ_TEST}', '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}') THEN app.id END)`,
          "test",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.IQ_TEST}' THEN app.id END)`,
          "iqTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}' THEN app.id END)`,
          "technicalTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW}' THEN app.id END)`,
          "boPhanChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1}' THEN app.id END)`,
          "pvVong1",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_2}' THEN app.id END)`,
          "pvVong2",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.OFFER}' THEN app.id END)`,
          "offer",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}' THEN app.id END)`,
          "diLam",
        )
        // Lấy distinct department_name từ bảng manager làm nguồn danh sách phòng ban
        .from(
          (subQb) =>
            subQb
              .select("TRIM(m.department_name)", "department_name")
              .from("recruitment_manager", "m")
              .where("m.department_name IS NOT NULL")
              .andWhere("m.department_name != ''")
              .groupBy("TRIM(m.department_name)"),
          "rm",
        )
        .leftJoin(
          "applications",
          "app",
          appJoinCondition,
          appJoinParams,
        )
        // Join toàn bộ pipeline entries (không chỉ entry mới nhất)
        // → mỗi ứng viên được đếm cho MỌI bước họ đã đi qua trong khoảng cp.start_time.
        .leftJoin(
          "candidate_pipeline",
          "cp",
          deptPipelineJoinCondition,
          deptPipelineJoinParams,
        )
        .groupBy("rm.department_name")
        .orderBy("rm.department_name", "ASC");

      const rows = await qb.getRawMany();

      // ============================================================
      // Tính success_rate theo phòng ban
      //
      // Logic:
      //   - ro.team là CSV, ví dụ: "Data, Unicorn"
      //   - ro.quantity là tổng số lượng cần tuyển cho order đó
      //   - onboarded_count = số DISTINCT app.id có pipeline ONBOARDING
      //     và cp.start_time nằm trong khoảng start_date/end_date.
      //   - Không lọc theo app.applied_date.
      //   - success_rate của department D = SUM(onboarded_count) / SUM(quantity) * 100
      //     qua tất cả order có team chứa department D.
      //
      // Triển khai 2 queries SQL + tính trong TypeScript:
      //   Bước 1: Lấy tất cả order có team và quantity hợp lệ (không bị cancel)
      //   Bước 2: Lấy số ứng viên đã onboard trong khoảng cp.start_time, group theo (order_id)
      //           Match ứng viên → order qua app.position (numeric ID hoặc tên vị trí)
      //   Bước 3: Tách CSV ro.team, tính SUM(onboarded)/SUM(quantity) theo department
      // ============================================================

      // Bước 1: Lấy các order không bị cancel, có team và quantity
      const deptOrders = await this.dataSource
        .createQueryBuilder()
        .select("ro.id", "orderId")
        .addSelect("ro.team", "team")
        .addSelect("ro.quantity", "quantity")
        .addSelect("ro.position", "position")
        .from("recruitment_orders", "ro")
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :deptCs1", {
          deptCs1: RecruitmentOrderStatus.CANCELLED,
        })
        .andWhere("ro.team IS NOT NULL")
        .andWhere("ro.team != ''")
        .andWhere("ro.quantity IS NOT NULL")
        .andWhere("ro.quantity != ''")
        .getRawMany();

      // Bước 2: Số ứng viên đã onboard per order
      // JOIN application → order qua app.position (numeric ID hoặc tên vị trí)
      let deptOnboardedJoinCond = `
        app.deleted_at IS NULL
        AND (
          (app.position REGEXP '^[0-9]+$' AND CAST(app.position AS UNSIGNED) = ro.id)
          OR (app.position NOT REGEXP '^[0-9]+$' AND LOWER(TRIM(app.position)) = LOWER(TRIM(ro.position)))
        )
      `;
      const deptOnboardedParams: Record<string, any> = {};
      let deptOnboardedPipelineCond = `
        cp.application_id = app.id
        AND cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}'
      `;
      deptOnboardedPipelineCond = this.applyPipelineStartTimeRange(
        deptOnboardedPipelineCond,
        deptOnboardedParams,
        "cp",
        "dept_ob",
        start_date,
        end_date,
      );

      const deptOnboardedRows = await this.dataSource
        .createQueryBuilder()
        .select("ro.id", "orderId")
        .addSelect("COUNT(DISTINCT app.id)", "onboardedCount")
        .from("recruitment_orders", "ro")
        .innerJoin(
          "applications",
          "app",
          deptOnboardedJoinCond,
          deptOnboardedParams,
        )
        .innerJoin(
          "candidate_pipeline",
          "cp",
          deptOnboardedPipelineCond,
          deptOnboardedParams,
        )
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :deptCs2", {
          deptCs2: RecruitmentOrderStatus.CANCELLED,
        })
        .groupBy("ro.id")
        .getRawMany();

      // Bước 3: Tính success_rate trong TypeScript
      // Build map: orderId → onboardedCount
      const deptOnboardedMap = new Map<number, number>();
      for (const r of deptOnboardedRows) {
        deptOnboardedMap.set(Number(r.orderId), Number(r.onboardedCount));
      }

      // Tách ro.team CSV, tính per-order rate cho từng department trong mỗi order
      type DeptOrderRateDetail = {
        order_id: number;
        position: string;
        team: string; // toàn bộ giá trị team CSV của order
        quantity: number;
        onboarded: number;
        rate: number; // onboarded / quantity (dạng số thực, chưa nhân 100)
      };
      const ratesByDept: Record<string, DeptOrderRateDetail[]> = {};
      for (const order of deptOrders) {
        const qty = parseInt(order.quantity, 10);
        if (!qty || qty <= 0) continue;
        const departments = (order.team as string)
          .split(",")
          .map((d: string) => d.trim())
          .filter(Boolean);
        const onboarded = deptOnboardedMap.get(Number(order.orderId)) ?? 0;
        for (const dept of departments) {
          const deptKey = dept.trim();
          if (!ratesByDept[deptKey]) ratesByDept[deptKey] = [];
          ratesByDept[deptKey].push({
            order_id: Number(order.orderId),
            position: order.position ?? "",
            team: order.team ?? "",
            quantity: qty,
            onboarded,
            rate: onboarded / qty,
          });
        }
      }

      // success_rate (%) = onboarding / SUM(quantity) * 100, làm tròn 1 chữ số thập phân
      const deptSuccessRateMap: Record<string, number> = {};
      const deptTotalsMap: Record<
        string,
        { total_onboarded: number; total_quantity: number }
      > = {};
      for (const [dept, details] of Object.entries(ratesByDept)) {
        const totalQuantity = details.reduce((a, d) => a + d.quantity, 0);
        const onboardingCount = Number(
          rows.find((r) => r.departmentName?.trim() === dept)?.diLam ?? 0,
        );
        deptSuccessRateMap[dept] =
          totalQuantity > 0
            ? Math.round((onboardingCount / totalQuantity) * 1000) / 10
            : 0;
        deptTotalsMap[dept] = {
          total_onboarded: onboardingCount,
          total_quantity: totalQuantity,
        };
      }

      const result = rows.map((r) => {
        const deptKey = r.departmentName?.trim();
        const details = ratesByDept[deptKey] ?? [];
        const totals = deptTotalsMap[deptKey] ?? {
          total_onboarded: 0,
          total_quantity: 0,
        };
        return {
          department_name: r.departmentName,
          received_cv: Number(r.ungTuyen),
          hr_scan: Number(r.hrChon),
          test: Number(r.test),
          iq_test: Number(r.iqTest),
          technical_test: Number(r.technicalTest),
          department_review: Number(r.boPhanChon),
          interview_round_1: Number(r.pvVong1),
          interview_round_2: Number(r.pvVong2),
          offer: Number(r.offer),
          onboarding: Number(r.diLam),
          success_rate: deptSuccessRateMap[deptKey] ?? 0, // % = onboarding/SUM(quantity) * 100
          // Chi tiết từng order đóng góp vào success_rate để dễ verify công thức:
          // success_rate = onboarding trên tất cả order thuộc dept này
          //              / SUM(quantity trên tất cả order thuộc dept này) * 100
          success_rate_detail: {
            total_onboarded: totals.total_onboarded,
            total_quantity: totals.total_quantity,
            orders: details.map((d) => ({
              order_id: d.order_id,
              position: d.position,
              team: d.team,
              quantity: d.quantity,
              onboarded: d.onboarded,
            })),
          },
        };
      });

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getByDepartment:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  async getBySource(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      let sourcePipelineJoinCondition = "cp.application_id = app.id";
      const sourcePipelineJoinParams: Record<string, any> = {};
      sourcePipelineJoinCondition = this.applyPipelineStartTimeRange(
        sourcePipelineJoinCondition,
        sourcePipelineJoinParams,
        "cp",
        "source_pipeline",
        start_date,
        end_date,
      );

      const qb = this.dataSource
        .createQueryBuilder()
        .select("app.source", "source")
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.RECEIVED_CV}' THEN app.id END)`,
          "ungTuyen",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.HR_SCAN}' THEN app.id END)`,
          "hrChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code IN ('${RECRUITMENT_PIPELINE_CODES.IQ_TEST}', '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}') THEN app.id END)`,
          "test",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.IQ_TEST}' THEN app.id END)`,
          "iqTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}' THEN app.id END)`,
          "technicalTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW}' THEN app.id END)`,
          "boPhanChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1}' THEN app.id END)`,
          "pvVong1",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_2}' THEN app.id END)`,
          "pvVong2",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.OFFER}' THEN app.id END)`,
          "offer",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}' THEN app.id END)`,
          "diLam",
        )
        // Đếm tổng RECEIVED_CV không lọc theo thời gian (dùng cho mẫu số success_rate)
        .addSelect(`COUNT(DISTINCT cp_rcv.application_id)`, "totalUngTuyen")
        .from("applications", "app")
        // Join toàn bộ pipeline entries (không chỉ entry mới nhất)
        // → mỗi ứng viên được đếm cho MỌI bước họ đã đi qua trong khoảng cp.start_time.
        .leftJoin(
          "candidate_pipeline",
          "cp",
          sourcePipelineJoinCondition,
          sourcePipelineJoinParams,
        )
        // Join riêng cho RECEIVED_CV không lọc ngày → mẫu số success_rate
        .leftJoin(
          "candidate_pipeline",
          "cp_rcv",
          `cp_rcv.application_id = app.id AND cp_rcv.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.RECEIVED_CV}'`,
        )
        .where("app.deleted_at IS NULL")
        .andWhere("app.source IS NOT NULL");

      qb.groupBy("app.source").orderBy("app.source", "ASC");

      const rows = await qb.getRawMany();

      // ============================================================
      // Tính success_rate theo nguồn tuyển dụng
      //
      // Công thức: success_rate = tổng ứng viên nhận việc / tổng ứng viên ứng tuyển * 100
      //
      // Trong đó:
      //   - Tổng ứng viên nhận việc (onboarded) = số ứng viên có pipeline ONBOARDING
      //     và cp.start_time nằm trong khoảng start_date/end_date
      //     → đây là "diLam" đã có trong query chính ở trên
      //   - Tổng ứng viên ứng tuyển = số ứng viên có pipeline RECEIVED_CV
      //     (không lọc theo thời gian, tính toàn bộ lịch sử)
      //     → đây là "totalUngTuyen" từ join cp_rcv trong query chính
      //   - Không lọc theo app.applied_date.
      //
      //   Ví dụ: Nguồn "LinkedIn" có 50 ứng viên ứng tuyển (toàn bộ), 10 ứng viên nhận việc (trong kỳ)
      //     → success_rate = 10 / 50 * 100 = 20%
      //
      // Lưu ý: Khác với success_rate ở getByPosition/getByLevel/getByDepartment
      //   (dùng công thức AVG(onboarded/quantity) theo order, phản ánh mức độ đạt chỉ tiêu),
      //   ở đây success_rate đo hiệu quả chuyển đổi của từng nguồn tuyển:
      //   "Nguồn này mang lại bao nhiêu % ứng viên thực sự đi làm?"
      // ============================================================

      const result = rows.map((r) => {
        const receivedCv = Number(r.ungTuyen);
        const totalReceivedCv = Number(r.totalUngTuyen);
        const onboarded = Number(r.diLam);
        // success_rate = onboarded / totalReceivedCv * 100, làm tròn 1 chữ số thập phân
        // Mẫu số dùng tổng RECEIVED_CV không lọc theo thời gian
        // Nếu chưa có ứng viên nào → trả 0 để tránh chia cho 0
        const successRate =
          totalReceivedCv > 0
            ? Math.round((onboarded / totalReceivedCv) * 1000) / 10
            : 0;
        return {
          source: r.source,
          received_cv: receivedCv,
          total_received_cv: totalReceivedCv,
          hr_scan: Number(r.hrChon),
          test: Number(r.test),
          iq_test: Number(r.iqTest),
          technical_test: Number(r.technicalTest),
          department_review: Number(r.boPhanChon),
          interview_round_1: Number(r.pvVong1),
          interview_round_2: Number(r.pvVong2),
          offer: Number(r.offer),
          onboarding: onboarded,
          success_rate: successRate, // % = onboarded / received_cv * 100
        };
      });

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getBySource:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  async getByUniversitySchool(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      let universityPipelineJoinCondition = "cp.application_id = app.id";
      const universityPipelineJoinParams: Record<string, any> = {};
      universityPipelineJoinCondition = this.applyPipelineStartTimeRange(
        universityPipelineJoinCondition,
        universityPipelineJoinParams,
        "cp",
        "university_pipeline",
        start_date,
        end_date,
      );

      const qb = this.dataSource
        .createQueryBuilder()
        .select("c.university_school", "universitySchool")
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.RECEIVED_CV}' THEN app.id END)`,
          "ungTuyen",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.HR_SCAN}' THEN app.id END)`,
          "hrChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code IN ('${RECRUITMENT_PIPELINE_CODES.IQ_TEST}', '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}') THEN app.id END)`,
          "test",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.IQ_TEST}' THEN app.id END)`,
          "iqTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}' THEN app.id END)`,
          "technicalTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW}' THEN app.id END)`,
          "boPhanChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1}' THEN app.id END)`,
          "pvVong1",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_2}' THEN app.id END)`,
          "pvVong2",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.OFFER}' THEN app.id END)`,
          "offer",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}' THEN app.id END)`,
          "diLam",
        )
        // Đếm tổng RECEIVED_CV không lọc theo thời gian (dùng cho mẫu số success_rate)
        .addSelect(`COUNT(DISTINCT cp_rcv.application_id)`, "totalUngTuyen")
        .from("applications", "app")
        .innerJoin(
          "candidates",
          "c",
          "c.id = app.candidate_id AND c.deleted_at IS NULL",
        )
        .leftJoin(
          "candidate_pipeline",
          "cp",
          universityPipelineJoinCondition,
          universityPipelineJoinParams,
        )
        // Join riêng cho RECEIVED_CV không lọc ngày → mẫu số success_rate
        .leftJoin(
          "candidate_pipeline",
          "cp_rcv",
          `cp_rcv.application_id = app.id AND cp_rcv.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.RECEIVED_CV}'`,
        )
        .where("app.deleted_at IS NULL")
        .andWhere("c.university_school IS NOT NULL")
        .andWhere("c.university_school != ''");

      qb.groupBy("c.university_school").orderBy("c.university_school", "ASC");

      const rows = await qb.getRawMany();

      const result = rows.map((r) => {
        const receivedCv = Number(r.ungTuyen);
        const totalReceivedCv = Number(r.totalUngTuyen);
        const onboarded = Number(r.diLam);
        // success_rate = ONBOARDING / tổng RECEIVED_CV (không lọc ngày)
        // Mẫu số dùng totalUngTuyen (toàn bộ lịch sử, không lọc theo thời gian)
        // Nếu không có RECEIVED_CV thì trả 0 để tránh chia cho 0.
        const successRate =
          totalReceivedCv > 0
            ? Math.round((onboarded / totalReceivedCv) * 1000) / 10
            : 0;

        return {
          university_school: r.universitySchool,
          received_cv: receivedCv,
          total_received_cv: totalReceivedCv,
          hr_scan: Number(r.hrChon),
          test: Number(r.test),
          iq_test: Number(r.iqTest),
          technical_test: Number(r.technicalTest),
          department_review: Number(r.boPhanChon),
          interview_round_1: Number(r.pvVong1),
          interview_round_2: Number(r.pvVong2),
          offer: Number(r.offer),
          onboarding: onboarded,
          success_rate: successRate, // % = onboarded / received_cv * 100
        };
      });

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getByUniversitySchool:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  async getByRecruiter(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      let recruiterPipelineJoinCondition = "cp.application_id = app.id";
      const recruiterPipelineJoinParams: Record<string, any> = {};
      recruiterPipelineJoinCondition = this.applyPipelineStartTimeRange(
        recruiterPipelineJoinCondition,
        recruiterPipelineJoinParams,
        "cp",
        "recruiter_pipeline",
        start_date,
        end_date,
      );

      const qb = this.dataSource
        .createQueryBuilder()
        .select("u.id", "recruiterCode")
        .addSelect("COALESCE(u.personnel_name, u.full_name, u.email)", "recruiterName")        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.RECEIVED_CV}' THEN app.id END)`,
          "ungTuyen",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.HR_SCAN}' THEN app.id END)`,
          "hrChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code IN ('${RECRUITMENT_PIPELINE_CODES.IQ_TEST}', '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}') THEN app.id END)`,
          "test",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.IQ_TEST}' THEN app.id END)`,
          "iqTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST}' THEN app.id END)`,
          "technicalTest",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW}' THEN app.id END)`,
          "boPhanChon",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1}' THEN app.id END)`,
          "pvVong1",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_2}' THEN app.id END)`,
          "pvVong2",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.OFFER}' THEN app.id END)`,
          "offer",
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN cp.recruitment_pipeline_code = '${RECRUITMENT_PIPELINE_CODES.ONBOARDING}' THEN app.id END)`,
          "diLam",
        )
        .from("applications", "app")
        .innerJoin("users", "u", "u.id = app.created_by")
       // .innerJoin("users", "u", "u.id = app.created_by")
        // Join toàn bộ pipeline entries (không chỉ entry mới nhất)
        // → mỗi ứng viên được đếm cho MỌI bước họ đã đi qua trong khoảng cp.start_time.
        .leftJoin(
          "candidate_pipeline",
          "cp",
          recruiterPipelineJoinCondition,
          recruiterPipelineJoinParams,
        )
        .where("app.deleted_at IS NULL")
        .andWhere("app.created_by IS NOT NULL");

      qb
      .groupBy("app.created_by")
      .addGroupBy("u.id")
     .addGroupBy("u.personnel_name")
     .addGroupBy("u.full_name")
      .addGroupBy("u.email")
     .orderBy("COALESCE(u.personnel_name, u.full_name, u.email)", "ASC");

      const rows = await qb.getRawMany();

      // ============================================================
      // Tính completion_rate (tỷ lệ hoàn thành chỉ tiêu tuyển dụng) theo recruiter
      //
      // Công thức: completion_rate = số đã tuyển / tổng chỉ tiêu * 100
      //
      // Trong đó:
      //   - Số đã tuyển = số ứng viên đã onboarding mà NGƯỜI ĐÓ TRỰC TIẾP TUYỂN
      //     → tức là app.created_by = recruiter_code VÀ có pipeline onboarding
      //     → pipeline onboarding phải có cp.start_time nằm trong khoảng start_date/end_date
      //     → đây chính là giá trị "diLam" đã có trong query chính ở trên
      //     → không lọc theo app.applied_date
      //
      //   - Tổng chỉ tiêu = SUM(ro.quantity) của TẤT CẢ order (không phân biệt pic)
      //     → thực tế chỉ có 1 pic duy nhất nên không cần group theo pic
      //     → tổng toàn bộ quantity là con số chỉ tiêu chung cho tất cả recruiter
      //
      //   Ví dụ: Tổng quantity tất cả order = 100
      //     Recruiter A onboard được 70 ứng viên (created_by = A)
      //     → completion_rate = 70 / 100 * 100 = 70%
      //
      // Triển khai:
      //   - Tử số (onboarded): lấy trực tiếp từ "diLam" của query chính
      //   - Mẫu số (total quota): 1 query SUM(ro.quantity) toàn bộ order active
      // ============================================================

      // Query tổng quantity của tất cả order không bị cancel
      const totalQuotaRow = await this.dataSource
        .createQueryBuilder()
        .select("SUM(CAST(ro.quantity AS UNSIGNED))", "totalQuantity")
        .from("recruitment_orders", "ro")
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :recQtyCs", {
          recQtyCs: RecruitmentOrderStatus.CANCELLED,
        })
        .andWhere("ro.quantity IS NOT NULL")
        .andWhere("ro.quantity != ''")
        .getRawOne();

      const totalQuota = Number(totalQuotaRow?.totalQuantity) || 0;

      const result = rows.map((r) => {
        const onboarded = Number(r.diLam); // ứng viên đã onboard do recruiter này trực tiếp tuyển (created_by)
        // completion_rate = onboarded / totalQuota * 100
        // Tổng chỉ tiêu là chung cho toàn bộ, không tách riêng theo recruiter
        const completionRate =
          totalQuota > 0 ? Math.round((onboarded / totalQuota) * 1000) / 10 : 0;
        return {
          recruiter_code: r.recruiterCode,
          recruiter_name: r.recruiterName,
          received_cv: Number(r.ungTuyen),
          hr_scan: Number(r.hrChon),
          test: Number(r.test),
          iq_test: Number(r.iqTest),
          technical_test: Number(r.technicalTest),
          department_review: Number(r.boPhanChon),
          interview_round_1: Number(r.pvVong1),
          interview_round_2: Number(r.pvVong2),
          offer: Number(r.offer),
          onboarding: onboarded,
          total_quota: totalQuota, // tổng chỉ tiêu toàn bộ order (SUM quantity)
          success_rate: completionRate, // % = onboarded / total_quota * 100
        };
      });

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getByRecruiter:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  /**
   * Thời gian trung bình từ applied_date → onboarding_date
   * Group by position, department
   */
  async getTimeToHire(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      // Group theo position duy nhất.
      // Lý do bỏ GROUP BY department:
      //   - app.department có thể là CSV ("Data, Unicorn")
      //   - Nếu group theo cả department thì cùng 1 ứng viên/vị trí
      //     bị tách thành nhiều dòng riêng biệt (ví dụ "2D Artist - Data",
      //     "2D Artist - Unicorn"), dẫn đến trùng lặp bản ghi
      //   - Mục tiêu là time-to-hire theo vị trí tuyển dụng, không cần tách theo phòng ban
      const positionExpr = `CASE
            WHEN app.position REGEXP '^[0-9]+$' THEN ro.position
            ELSE app.position
          END`;

      const qb = this.dataSource
        .createQueryBuilder()
        .select(
          "ROUND(AVG(DATEDIFF(app.onboarding_date, app.applied_date)), 1)",
          "avgDays",
        )
        .addSelect("COUNT(app.id)", "count")
        .addSelect(positionExpr, "position")
        .from("applications", "app")
        .leftJoin(
          "recruitment_orders",
          "ro",
          "app.position REGEXP '^[0-9]+$' AND ro.id = CAST(app.position AS UNSIGNED) AND ro.deleted_at IS NULL",
        )
        .where("app.deleted_at IS NULL")
        .andWhere("app.onboarding_date IS NOT NULL")
        .andWhere("app.applied_date IS NOT NULL");

      if (start_date) {
        qb.andWhere("app.applied_date >= :start_date", { start_date });
      }
      if (end_date) {
        qb.andWhere("app.applied_date <= :end_date", { end_date });
      }

      qb.groupBy(positionExpr).orderBy("avgDays", "DESC");

      const rows = await qb.getRawMany();

      // Tính trung bình tổng
      const totalQb = this.dataSource
        .createQueryBuilder()
        .select(
          "ROUND(AVG(DATEDIFF(app.onboarding_date, app.applied_date)), 1)",
          "avgDays",
        )
        .addSelect("COUNT(app.id)", "count")
        .from("applications", "app")
        .where("app.deleted_at IS NULL")
        .andWhere("app.onboarding_date IS NOT NULL")
        .andWhere("app.applied_date IS NOT NULL");

      if (start_date) {
        totalQb.andWhere("app.applied_date >= :start_date", { start_date });
      }
      if (end_date) {
        totalQb.andWhere("app.applied_date <= :end_date", { end_date });
      }

      const totalRow = await totalQb.getRawOne();

      const result = {
        summary: {
          avg_days: Number(totalRow?.avgDays) || 0,
          total_hired: Number(totalRow?.count) || 0,
        },
        details: rows.map((r) => ({
          position: r.position,
          avg_days: Number(r.avgDays) || 0,
          count: Number(r.count),
        })),
      };

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getTimeToHire:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  /**
   * Time to Fill = số ngày trung bình từ khi TẠO ORDER (ro.created_at) đến khi ỨNG VIÊN ĐI LÀM (app.onboarding_date)
   * Công thức: AVG( DATEDIFF(app.onboarding_date, ro.created_at) )
   *
   * Lưu ý quan trọng: ro.team (phòng ban của order) có thể là CSV, ví dụ "Data, Unicorn".
   * → Nếu group trực tiếp theo ro.team thì "Data, Unicorn" sẽ thành 1 nhóm riêng biệt,
   *   không được tách ra thành "Data" và "Unicorn".
   * → Giải pháp: Lấy danh sách phòng ban distinct từ recruitment_manager,
   *   rồi dùng FIND_IN_SET để match từng phòng ban với ro.team CSV.
   *   Ví dụ: order có team="Data, Unicorn" sẽ được tính cho cả dept "Data" và dept "Unicorn".
   *
   * by_department: Tách CSV ro.team → group theo từng phòng ban riêng lẻ
   * by_month: Group theo tháng onboarding, không bị ảnh hưởng bởi CSV (dùng DISTINCT app.id để không đếm trùng)
   * summary: Tổng hợp toàn bộ, dùng DISTINCT app.id để tránh đếm trùng khi 1 order match nhiều department
   */
  async getTimeToFill(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      // Điều kiện JOIN application → order:
      // app.position có thể là ID số (match ro.id) hoặc tên vị trí (match ro.position)
      // Chỉ lấy ứng viên đã onboard (app.onboarding_date IS NOT NULL)
      let appJoinCondition = `
        app.deleted_at IS NULL
        AND app.onboarding_date IS NOT NULL
        AND (
          (app.position REGEXP '^[0-9]+$' AND CAST(app.position AS UNSIGNED) = ro.id)
          OR
          (app.position NOT REGEXP '^[0-9]+$' AND LOWER(TRIM(app.position)) = LOWER(TRIM(ro.position)))
        )
      `;
      const appJoinParams: Record<string, any> = {};

      if (start_date) {
        appJoinCondition += " AND app.applied_date >= :join_start_date";
        appJoinParams.join_start_date = start_date;
      }
      if (end_date) {
        appJoinCondition += " AND app.applied_date <= :join_end_date";
        appJoinParams.join_end_date = end_date;
      }

      // --- By department ---
      // Bước 1: Lấy danh sách phòng ban DISTINCT từ recruitment_manager (nguồn master)
      // Bước 2: JOIN với order bằng FIND_IN_SET(dept_name, ro.team) để tách CSV
      //   Ví dụ: order có team="Data, Unicorn" → FIND_IN_SET('Data', 'Data,Unicorn') = 1 → match dept "Data"
      //                                        → FIND_IN_SET('Unicorn', 'Data,Unicorn') = 2 → match dept "Unicorn"
      // Bước 3: JOIN application vào order để tính DATEDIFF
      // Kết quả: mỗi phòng ban riêng lẻ có avg_days và count riêng

      // Điều kiện JOIN order vào department: ro.team CSV chứa tên phòng ban
      let orderJoinCondition = `
        ro.deleted_at IS NULL
        AND ro.status != '${RecruitmentOrderStatus.CANCELLED}'
        AND FIND_IN_SET(TRIM(rm.department_name), REPLACE(ro.team, ', ', ',')) > 0
      `;

      const byDeptQb = this.dataSource
        .createQueryBuilder()
        .select("rm.department_name", "department")
        .addSelect(
          "ROUND(AVG(DATEDIFF(app.onboarding_date, ro.created_at)), 1)",
          "avgDays",
        )
        .addSelect("COUNT(DISTINCT app.id)", "count")
        // Nguồn: danh sách phòng ban distinct
        .from(
          (subQb) =>
            subQb
              .select("TRIM(m.department_name)", "department_name")
              .from("recruitment_manager", "m")
              .where("m.department_name IS NOT NULL")
              .andWhere("m.department_name != ''")
              .groupBy("TRIM(m.department_name)"),
          "rm",
        )
        // JOIN order: dùng FIND_IN_SET để match từng phòng ban với ro.team CSV
        .leftJoin("recruitment_orders", "ro", orderJoinCondition)
        // JOIN application vào order
        .leftJoin(
          "applications",
          "app",
          appJoinCondition,
          appJoinParams,
        )
        .groupBy("rm.department_name")
        .having("COUNT(DISTINCT app.id) > 0")
        .orderBy("avgDays", "DESC");

      const byDeptRows = await byDeptQb.getRawMany();

      // --- By month ---
      // Group theo tháng onboarding, dùng DISTINCT app.id để tránh đếm trùng
      // (1 application chỉ match 1 order nên không bị trùng ở đây)
      const byMonthQb = this.dataSource
        .createQueryBuilder()
        .select("DATE_FORMAT(app.onboarding_date, '%Y-%m')", "month")
        .addSelect(
          "ROUND(AVG(DATEDIFF(app.onboarding_date, ro.created_at)), 1)",
          "avgDays",
        )
        .addSelect("COUNT(DISTINCT app.id)", "count")
        .from("recruitment_orders", "ro")
        .innerJoin(
          "applications",
          "app",
          appJoinCondition,
          appJoinParams,
        )
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :cancelledStatus", {
          cancelledStatus: RecruitmentOrderStatus.CANCELLED,
        })
        .groupBy("DATE_FORMAT(app.onboarding_date, '%Y-%m')")
        .orderBy("month", "ASC");

      const byMonthRows = await byMonthQb.getRawMany();

      // --- By position ---
      // Group theo ro.position (tên vị trí tuyển dụng từ order).
      // Tương tự getTimeToHire nhưng dùng ro.created_at thay vì app.applied_date làm điểm bắt đầu:
      //   time-to-fill = từ lúc MỞ ORDER đến lúc ứng viên ĐI LÀM
      const byPositionQb = this.dataSource
        .createQueryBuilder()
        .select("ro.position", "position")
        .addSelect(
          "ROUND(AVG(DATEDIFF(app.onboarding_date, ro.created_at)), 1)",
          "avgDays",
        )
        .addSelect("COUNT(DISTINCT app.id)", "count")
        .from("recruitment_orders", "ro")
        .innerJoin(
          "applications",
          "app",
          appJoinCondition,
          appJoinParams,
        )
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :cancelledStatus", {
          cancelledStatus: RecruitmentOrderStatus.CANCELLED,
        })
        .andWhere("ro.position IS NOT NULL")
        .andWhere("ro.position != ''")
        .groupBy("ro.position")
        .orderBy("avgDays", "DESC");

      const byPositionRows = await byPositionQb.getRawMany();

      // --- Summary ---
      // Tổng hợp: AVG time-to-fill trên toàn bộ application đã onboard
      const summaryQb = this.dataSource
        .createQueryBuilder()
        .select(
          "ROUND(AVG(DATEDIFF(app.onboarding_date, ro.created_at)), 1)",
          "avgDays",
        )
        .addSelect("COUNT(DISTINCT app.id)", "count")
        .from("recruitment_orders", "ro")
        .innerJoin(
          "applications",
          "app",
          appJoinCondition,
          appJoinParams,
        )
        .where("ro.deleted_at IS NULL")
        .andWhere("ro.status != :cancelledStatus", {
          cancelledStatus: RecruitmentOrderStatus.CANCELLED,
        });

      const summaryRow = await summaryQb.getRawOne();

      const result = {
        summary: {
          avg_days: Number(summaryRow?.avgDays) || 0,
          total_filled: Number(summaryRow?.count) || 0,
        },
        by_department: byDeptRows.map((r) => ({
          department: r.department,
          avg_days: Number(r.avgDays) || 0,
          count: Number(r.count),
        })),
        by_position: byPositionRows.map((r) => ({
          position: r.position,
          avg_days: Number(r.avgDays) || 0,
          count: Number(r.count),
        })),
        by_month: byMonthRows.map((r) => ({
          month: r.month,
          avg_days: Number(r.avgDays) || 0,
          count: Number(r.count),
        })),
      };

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getTimeToFill:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }

  /**
   * Thời gian trung bình ứng viên lưu lại tại mỗi bước pipeline
   * Tính bằng TIMESTAMPDIFF(DAY, start_time, COALESCE(end_time, NOW()))
   */
  async getTimeInStage(query: QueryReportByPositionDTO, res: Response) {
    try {
      const { start_date, end_date } = query;

      const qb = this.dataSource
        .createQueryBuilder()
        .select("cp.recruitment_pipeline_code", "pipelineCode")
        .addSelect(
          "ROUND(AVG(TIMESTAMPDIFF(HOUR, cp.start_time, COALESCE(cp.end_time, NOW())) / 24), 1)",
          "avgDays",
        )
        .addSelect("COUNT(cp.id)", "count")
        .from("candidate_pipeline", "cp")
        .innerJoin(
          "applications",
          "app",
          "app.id = cp.application_id AND app.deleted_at IS NULL",
        );

      if (start_date) {
        qb.andWhere("app.applied_date >= :start_date", { start_date });
      }
      if (end_date) {
        qb.andWhere("app.applied_date <= :end_date", { end_date });
      }

      qb.groupBy("cp.recruitment_pipeline_code").orderBy("avgDays", "DESC");

      const rows = await qb.getRawMany();

      // Đảm bảo trả về đủ các pipeline codes, kể cả code chưa có data
      const codeMap: Record<string, { avg_days: number; count: number }> = {};
      rows.forEach((r) => {
        codeMap[r.pipelineCode] = {
          avg_days: Number(r.avgDays) || 0,
          count: Number(r.count),
        };
      });

      const result = Object.entries(RECRUITMENT_PIPELINE_CODES)
        .filter(([key]) => key !== "RECEIVED_CV" && key !== "FAIL")
        .map(([, code]) => ({
          pipeline_code: code,
          avg_days: codeMap[code]?.avg_days ?? 0,
          count: codeMap[code]?.count ?? 0,
        }));

      return res.status(HttpStatus.OK).json({
        code: HttpStatus.OK,
        message: "Success",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getTimeInStage:", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || "Internal server error",
      });
    }
  }
}
