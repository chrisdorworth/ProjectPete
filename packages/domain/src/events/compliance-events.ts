interface BaseEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

export interface SuppressionAdded extends BaseEvent {
  readonly type: "SuppressionAdded";
  readonly payload: {
    leadId: string | null;
    email: string | null;
    phone: string | null;
    reason: string;
    source: string;
    permanent: boolean;
  };
}

export interface SuppressionRemoved extends BaseEvent {
  readonly type: "SuppressionRemoved";
  readonly payload: {
    suppressionId: string;
    removedBy: string;
    reason: string;
  };
}

export interface DataExportRequested extends BaseEvent {
  readonly type: "DataExportRequested";
  readonly payload: {
    leadId: string;
    requestType: "ccpa" | "gdpr";
    requestedBy: string;
    deadline: string;
  };
}

export interface DataExportCompleted extends BaseEvent {
  readonly type: "DataExportCompleted";
  readonly payload: {
    leadId: string;
    requestType: "ccpa" | "gdpr";
    exportUrl: string;
    fieldsIncluded: string[];
  };
}

export interface RetentionFlagged extends BaseEvent {
  readonly type: "RetentionFlagged";
  readonly payload: {
    leadId: string;
    daysSinceLastActivity: number;
    scheduledPurgeDate: string;
  };
}

export interface RetentionPurged extends BaseEvent {
  readonly type: "RetentionPurged";
  readonly payload: {
    leadId: string;
    purgeMethod: "crypto_shred" | "hard_delete";
    fieldsRemoved: string[];
  };
}

export interface FeedbackRecorded extends BaseEvent {
  readonly type: "FeedbackRecorded";
  readonly payload: {
    leadId: string;
    outcome: "converted" | "disqualified" | "lost";
    featureSnapshot: Record<string, unknown>;
  };
}

export interface ModelRetrained extends BaseEvent {
  readonly type: "ModelRetrained";
  readonly payload: {
    modelName: string;
    version: string;
    metrics: {
      auc: number;
      precisionAtK: number;
      calibrationError: number;
    };
    trainingRows: number;
    previousVersion: string | null;
  };
}

export interface ModelDeployed extends BaseEvent {
  readonly type: "ModelDeployed";
  readonly payload: {
    modelName: string;
    version: string;
    deployedBy: "auto" | string;
  };
}

export interface ModelRolledBack extends BaseEvent {
  readonly type: "ModelRolledBack";
  readonly payload: {
    modelName: string;
    fromVersion: string;
    toVersion: string;
    reason: string;
  };
}

export interface ExperimentStarted extends BaseEvent {
  readonly type: "ExperimentStarted";
  readonly payload: {
    experimentId: string;
    name: string;
    controlModel: string;
    treatmentModel: string;
    splitRatio: number;
  };
}

export interface ExperimentConcluded extends BaseEvent {
  readonly type: "ExperimentConcluded";
  readonly payload: {
    experimentId: string;
    winner: "control" | "treatment";
    controlConversionRate: number;
    treatmentConversionRate: number;
    sampleSize: number;
    pValue: number;
  };
}
