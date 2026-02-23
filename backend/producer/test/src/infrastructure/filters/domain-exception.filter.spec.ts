import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";

import { DomainExceptionFilter } from "../../../../src/infrastructure/filters/domain-exception.filter";

const buildMockHost = (
  mockResponse: Record<string, jest.Mock>,
): ArgumentsHost =>
  ({
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
  }) as unknown as ArgumentsHost;

describe("DomainExceptionFilter", () => {
  let filter: DomainExceptionFilter;

  beforeEach(() => {
    filter = new DomainExceptionFilter();
  });

  it("should be defined", () => {
    expect(filter).toBeDefined();
  });

  // HUMAN CHECK: Errores de dominio (genéricos) → HTTP 400
  it("should return 400 for generic domain errors", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const host = buildMockHost({ status: mockStatus, json: mockJson });

    const error = new Error("Invalid ID card");
    filter.catch(error, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Invalid ID card",
        error: "Bad Request",
      }),
    );
  });

  it("should pass through HttpException with its original status", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const host = buildMockHost({ status: mockStatus, json: mockJson });

    const exception = new HttpException("Not Found", HttpStatus.NOT_FOUND);
    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it("should pass through 403 Forbidden HttpException", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const host = buildMockHost({ status: mockStatus, json: mockJson });

    const exception = new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
  });

  it("should pass through 400 Bad Request HttpException preserving response body", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const host = buildMockHost({ status: mockStatus, json: mockJson });

    const body = { statusCode: 400, message: ["name must be a string"] };
    const exception = new HttpException(body, HttpStatus.BAD_REQUEST);
    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(body);
  });

  it("should handle error with empty message", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const host = buildMockHost({ status: mockStatus, json: mockJson });

    const error = new Error("");
    filter.catch(error, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.BAD_REQUEST }),
    );
  });
});
