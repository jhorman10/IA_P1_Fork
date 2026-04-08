/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
import { HydratedDocument } from "mongoose";
export type AuditAction =
  | "APPOINTMENT_ASSIGNED"
  | "APPOINTMENT_COMPLETED"
  | "DOCTOR_CHECK_IN"
  | "DOCTOR_CHECK_OUT";
export type AuditLogDocument = HydratedDocument<AuditLog>;
export interface AuditDetails {
  patientIdCard?: number;
  patientName?: string;
  doctorName?: string;
  office?: string | null;
  priority?: string;
  queuePosition?: number;
  [key: string]: unknown;
}
export declare class AuditLog {
  action: AuditAction;
  appointmentId: string | null;
  doctorId: string | null;
  details: AuditDetails;
  timestamp: number;
}
export declare const AuditLogSchema: import("mongoose").Schema<
  AuditLog,
  import("mongoose").Model<
    AuditLog,
    any,
    any,
    any,
    | (import("mongoose").Document<
        unknown,
        any,
        AuditLog,
        any,
        import("mongoose").DefaultSchemaOptions
      > &
        AuditLog & {
          _id: import("mongoose").Types.ObjectId;
        } & {
          __v: number;
        } & {
          id: string;
        })
    | (import("mongoose").Document<
        unknown,
        any,
        AuditLog,
        any,
        import("mongoose").DefaultSchemaOptions
      > &
        AuditLog & {
          _id: import("mongoose").Types.ObjectId;
        } & {
          __v: number;
        }),
    any,
    AuditLog
  >,
  {},
  {},
  {},
  {},
  import("mongoose").DefaultSchemaOptions,
  AuditLog,
  import("mongoose").Document<
    unknown,
    {},
    AuditLog,
    {
      id: string;
    },
    import("mongoose").DefaultSchemaOptions
  > &
    Omit<
      AuditLog & {
        _id: import("mongoose").Types.ObjectId;
      } & {
        __v: number;
      },
      "id"
    > & {
      id: string;
    },
  {
    action?:
      | import("mongoose").SchemaDefinitionProperty<
          AuditAction,
          AuditLog,
          import("mongoose").Document<
            unknown,
            {},
            AuditLog,
            {
              id: string;
            },
            import("mongoose").DefaultSchemaOptions
          > &
            Omit<
              AuditLog & {
                _id: import("mongoose").Types.ObjectId;
              } & {
                __v: number;
              },
              "id"
            > & {
              id: string;
            }
        >
      | undefined;
    appointmentId?:
      | import("mongoose").SchemaDefinitionProperty<
          string | null,
          AuditLog,
          import("mongoose").Document<
            unknown,
            {},
            AuditLog,
            {
              id: string;
            },
            import("mongoose").DefaultSchemaOptions
          > &
            Omit<
              AuditLog & {
                _id: import("mongoose").Types.ObjectId;
              } & {
                __v: number;
              },
              "id"
            > & {
              id: string;
            }
        >
      | undefined;
    doctorId?:
      | import("mongoose").SchemaDefinitionProperty<
          string | null,
          AuditLog,
          import("mongoose").Document<
            unknown,
            {},
            AuditLog,
            {
              id: string;
            },
            import("mongoose").DefaultSchemaOptions
          > &
            Omit<
              AuditLog & {
                _id: import("mongoose").Types.ObjectId;
              } & {
                __v: number;
              },
              "id"
            > & {
              id: string;
            }
        >
      | undefined;
    details?:
      | import("mongoose").SchemaDefinitionProperty<
          AuditDetails,
          AuditLog,
          import("mongoose").Document<
            unknown,
            {},
            AuditLog,
            {
              id: string;
            },
            import("mongoose").DefaultSchemaOptions
          > &
            Omit<
              AuditLog & {
                _id: import("mongoose").Types.ObjectId;
              } & {
                __v: number;
              },
              "id"
            > & {
              id: string;
            }
        >
      | undefined;
    timestamp?:
      | import("mongoose").SchemaDefinitionProperty<
          number,
          AuditLog,
          import("mongoose").Document<
            unknown,
            {},
            AuditLog,
            {
              id: string;
            },
            import("mongoose").DefaultSchemaOptions
          > &
            Omit<
              AuditLog & {
                _id: import("mongoose").Types.ObjectId;
              } & {
                __v: number;
              },
              "id"
            > & {
              id: string;
            }
        >
      | undefined;
  },
  AuditLog
>;
