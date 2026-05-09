import jsPDF from "jspdf";
import "jspdf-autotable";

export const generateInvoice = (order) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 10;

  const orderId = order._id ? String(order._id).slice(-6).toUpperCase() : "UNKNOWN";

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SWADKART", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Online Food Delivery", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Order #${orderId}`, 5, yPos);
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const createdAtDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const dateStr = isNaN(createdAtDate.getTime()) ? "Unknown" : createdAtDate.toLocaleDateString();
  const timeStr = isNaN(createdAtDate.getTime()) ? "" : createdAtDate.toLocaleTimeString();
  doc.text(`Date: ${dateStr}`, 5, yPos);
  yPos += 5;
  if (timeStr) {
    doc.text(`Time: ${timeStr}`, 5, yPos);
    yPos += 5;
  }
  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Customer:", 5, yPos);
  yPos += 4;
  doc.setFont("helvetica", "normal");
  doc.text(order.shippingAddress?.fullName || "N/A", 5, yPos);
  yPos += 4;
  doc.text(order.shippingAddress?.phone || "N/A", 5, yPos);
  yPos += 4;

  const addressLines = doc.splitTextToSize(
    order.shippingAddress?.address || "N/A",
    pageWidth - 10
  );
  doc.text(addressLines, 5, yPos);
  yPos += addressLines.length * 4 + 4;

  const tableColumn = ["Item", "Qty", "Price"];
  const tableRows = [];

  (order.orderItems || []).forEach((item) => {
    let itemName = item?.name || "Item";
    if (item.selectedVariant) itemName += ` (${item.selectedVariant.name})`;
    if (item.selectedAddons && item.selectedAddons.length > 0)
      itemName += " + Addons";

    const itemData = [itemName, item?.qty || 0, `Rs.${item?.price || 0}`];
    tableRows.push(itemData);
  });

  doc.autoTable({
    startY: yPos,
    head: [tableColumn],
    body: tableRows,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1, overflow: "linebreak" },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 10, halign: "center" },
      2: { cellWidth: 20, halign: "right" },
    },
    margin: { left: 5, right: 5 },
  });

  yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : yPos + 5;

  doc.line(5, yPos, pageWidth - 5, yPos);
  yPos += 5;

  doc.setFontSize(9);
  doc.text("Subtotal:", 5, yPos);
  doc.text(`Rs.${order.itemsPrice ?? 0}`, pageWidth - 5, yPos, { align: "right" });
  yPos += 5;

  doc.text("Tax (5%):", 5, yPos);
  doc.text(`Rs.${order.taxPrice ?? 0}`, pageWidth - 5, yPos, { align: "right" });
  yPos += 5;

  doc.text("Delivery:", 5, yPos);
  doc.text(`Rs.${order.shippingPrice ?? 0}`, pageWidth - 5, yPos, {
    align: "right",
  });
  yPos += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 5, yPos);
  doc.text(`Rs.${order.totalPrice ?? 0}`, pageWidth - 5, yPos, { align: "right" });
  yPos += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for ordering!", pageWidth / 2, yPos, { align: "center" });

  yPos += 5;
  doc.setFont("helvetica", "bold");
  const paymentStatus =
    order.paymentMethod === "COD" ? "To Pay (COD)" : "PAID ONLINE";
  doc.text(paymentStatus, pageWidth / 2, yPos, { align: "center" });

  doc.save(`Invoice_${orderId}.pdf`);
};
