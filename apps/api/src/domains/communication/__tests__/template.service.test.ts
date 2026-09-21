import { describe, expect, it } from "vitest";
import { TemplateService } from "../template.service";

describe("TemplateService", () => {
  const service = new TemplateService();

  it("renders invoice.created template for email with html and text", () => {
    const result = service.render("invoice.created", "email", {
      clientName: "Alice Smith",
      invoiceNumber: "INV-1001",
      amount: "$1,500.00",
      dueDate: "2026-10-01",
      invoiceUrl: "https://app.freelance-os.com/invoices/inv-1",
    });

    expect(result.subject).toContain("INV-1001");
    expect(result.bodyText).toContain("Alice Smith");
    expect(result.bodyText).toContain("$1,500.00");
    expect(result.bodyHtml).toContain("View Invoice");
    expect(result.bodyHtml).toContain("https://app.freelance-os.com/invoices/inv-1");
  });

  it("renders invoice.created template for whatsapp with markdown styling", () => {
    const result = service.render("invoice.created", "whatsapp", {
      clientName: "Bob Jones",
      invoiceNumber: "INV-2002",
      amount: "$800.00",
      dueDate: "2026-09-30",
    });

    expect(result.subject).toBe("Invoice INV-2002");
    expect(result.bodyText).toContain("*#INV-2002*");
    expect(result.bodyText).toContain("*$800.00*");
    expect(result.bodyHtml).toBeUndefined();
  });

  it("renders payment.received template for email and whatsapp", () => {
    const emailResult = service.render("payment.received", "email", {
      clientName: "Charlie",
      invoiceNumber: "INV-3003",
      amount: "$500.00",
    });

    expect(emailResult.subject).toContain("Payment Received");
    expect(emailResult.bodyText).toContain("successfully received your payment");

    const waResult = service.render("payment.received", "whatsapp", {
      clientName: "Charlie",
      invoiceNumber: "INV-3003",
      amount: "$500.00",
    });

    expect(waResult.bodyText).toContain("We have received payment of *$500.00* for invoice *#INV-3003*");
  });

  it("renders change_order templates correctly", () => {
    const proposed = service.render("change_order.proposed", "email", {
      clientName: "Diana",
      title: "Mobile App Redesign Scope",
      additionalBudget: "2,000.00",
      timelineDeltaDays: 14,
    });

    expect(proposed.subject).toContain("Change Order Proposal: Mobile App Redesign Scope");
    expect(proposed.bodyText).toContain("+2,000.00");
    expect(proposed.bodyText).toContain("+14 days");

    const approved = service.render("change_order.approved", "whatsapp", {
      clientName: "Diana",
      title: "Mobile App Redesign Scope",
    });

    expect(approved.bodyText).toContain("approved");
  });

  it("uses default values when variables are omitted or missing", () => {
    const result = service.render("invoice.created", "whatsapp", {});
    expect(result.subject).toBe("Invoice INV-0000");
    expect(result.bodyText).toContain("Hello Client");
    expect(result.bodyText).toContain("*#INV-0000*");
    expect(result.bodyText).toContain("*0.00*");
  });

  it("falls back gracefully for unknown template keys", () => {
    const fallback = service.render("custom.notification", "email", {
      subject: "Custom Alert",
      message: "Custom body content",
    });

    expect(fallback.subject).toBe("Custom Alert");
    expect(fallback.bodyText).toBe("Custom body content");
  });
});
