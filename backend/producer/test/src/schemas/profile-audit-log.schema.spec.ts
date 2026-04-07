import { ProfileAuditLogSchema } from "src/schemas/profile-audit-log.schema";

describe("ProfileAuditLogSchema", () => {
  it("uses the profile_audit_logs collection", () => {
    expect(ProfileAuditLogSchema.get("collection")).toBe("profile_audit_logs");
  });

  it("defines required fields and default values", () => {
    const profileUidPath = ProfileAuditLogSchema.path("profileUid") as any;
    const changedByPath = ProfileAuditLogSchema.path("changedBy") as any;
    const beforePath = ProfileAuditLogSchema.path("before") as any;
    const afterPath = ProfileAuditLogSchema.path("after") as any;
    const timestampPath = ProfileAuditLogSchema.path("timestamp") as any;
    const reasonPath = ProfileAuditLogSchema.path("reason") as any;

    expect(profileUidPath.options.required).toBe(true);
    expect(changedByPath.options.required).toBe(true);
    expect(beforePath.options.required).toBe(true);
    expect(afterPath.options.required).toBe(true);
    expect(timestampPath.options.required).toBe(true);
    expect(reasonPath.options.default).toBeNull();
  });

  it("declares indexes for profileUid, changedBy, and timestamp", () => {
    const indexFields = ProfileAuditLogSchema.indexes().map(
      ([fields]) => fields,
    );

    expect(indexFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ profileUid: 1 }),
        expect.objectContaining({ changedBy: 1 }),
        expect.objectContaining({ timestamp: 1 }),
      ]),
    );
  });
});
