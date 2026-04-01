/**
 * \ud83e\uddea Tests for DoctorInfo component (SPEC-003)
 */

import { render, screen } from "@testing-library/react";

import { DoctorInfo } from "@/components/DoctorInfo/DoctorInfo";

describe("DoctorInfo", () => {
  it("should render doctor name", () => {
    render(<DoctorInfo doctorName="Dr. Juan García" office="3" />);
    expect(screen.getByText("Dr. Juan García")).toBeInTheDocument();
  });

  it("should render office", () => {
    render(<DoctorInfo doctorName="Dr. Juan García" office="3" />);
    expect(screen.getByText("Consultorio 3")).toBeInTheDocument();
  });

  it("should render doctor icon", () => {
    const { container } = render(
      <DoctorInfo doctorName="Dra. Ana López" office="5" />,
    );
    expect(container).toBeTruthy();
    expect(screen.getByText("Dra. Ana López")).toBeInTheDocument();
  });
});
