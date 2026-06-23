import { RECRUITMENT_PIPELINE_CODES } from "src/common/constants/recruitment.constants";
import {
  RecruitmentCandidateManagerReview,
  ReviewStatus,
} from "src/entities/recruitment-candidate-manager-review";

export interface GroupedByResult {
  needReview: any[];
  waitingInterview: any[];
  hired: any[];
  rejected: any[];
}

interface CategoryMapItem {
  name: keyof GroupedByResult;
  condition: (r: RecruitmentCandidateManagerReview) => boolean;
}

/**
 * Categorize candidate into 4 groups based on review records
 * Priority order: hired > rejected > waitingInterview > needReview
 *
 * @param reviewRecords - Array of review records for the candidate
 * @param candidateData - Candidate data to be added to one of the groups
 * @param groupedByResult - Object containing arrays for each category
 * @param managerIds - Only consider reviews from these manager IDs
 */
export function categorizeCandidateByReviewStatus(
  reviewRecords: RecruitmentCandidateManagerReview[],
  candidateData: any,
  groupedByResult: GroupedByResult,
  managerIds: number[],
): void {
  const managerIdSet = new Set(managerIds);

  // Define categorization criteria with priority order
  const categoryMap: CategoryMapItem[] = [
    {
      name: "hired",
      condition: (r: RecruitmentCandidateManagerReview) =>
        managerIdSet.has(r.reviewer_id) &&
        r.pipeline_code === RECRUITMENT_PIPELINE_CODES.ONBOARDING,
    },
    {
      name: "rejected",
      condition: (r: RecruitmentCandidateManagerReview) =>
        managerIdSet.has(r.reviewer_id) &&
        (r.pipeline_code === RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW ||
          r.pipeline_code === RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1) &&
        r.status === ReviewStatus.REJECT,
    },
    {
      name: "waitingInterview",
      condition: (r: RecruitmentCandidateManagerReview) =>
        managerIdSet.has(r.reviewer_id) &&
        r.pipeline_code === RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1 &&
        r.status === ReviewStatus.PENDING,
    },
    {
      name: "waitingInterview",
      condition: (r: RecruitmentCandidateManagerReview) =>
        managerIdSet.has(r.reviewer_id) &&
        r.pipeline_code === RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW &&
        r.status === ReviewStatus.APPROVE,
    },
    {
      name: "needReview",
      condition: (r: RecruitmentCandidateManagerReview) =>
        managerIdSet.has(r.reviewer_id) &&
        r.pipeline_code === RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW &&
        r.status === ReviewStatus.PENDING,
    },
  ];

  // Find matching category (order matters - higher priority first)
  for (const category of categoryMap) {
    const matchingRecord = reviewRecords.find(category.condition);
    if (matchingRecord) {
      groupedByResult[category.name].push(candidateData);
      return;
    }
  }
}
