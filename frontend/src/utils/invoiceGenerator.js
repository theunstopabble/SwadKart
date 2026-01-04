import jsPDF from "jspdf";
import "jspdf-autotable";

export const generateInvoice = (order) => {
  // 1. Create PDF instance (80mm width for Thermal Printer)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200], // 80mm width, dynamic height logic handled via autoTable
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 10;

  // --- HEADER ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SWADKART", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Online Food Delivery", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // --- ORDER DETAILS ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Order #${order._id.slice(-6).toUpperCase()}`, 5, yPos);
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 5, yPos);
  yPos += 5;
  doc.text(`Time: ${new Date(order.createdAt).toLocaleTimeString()}`, 5, yPos);
  yPos += 8;

  // --- CUSTOMER INFO ---
  doc.setFont("helvetica", "bold");
  doc.text("Customer:", 5, yPos);
  yPos += 4;
  doc.setFont("helvetica", "normal");
  doc.text(order.shippingAddress.fullName, 5, yPos);
  yPos += 4;
  doc.text(order.shippingAddress.phone, 5, yPos);
  yPos += 4;

  // Handle Multi-line Address
  const addressLines = doc.splitTextToSize(
    order.shippingAddress.address,
    pageWidth - 10
  );
  doc.text(addressLines, 5, yPos);
  yPos += addressLines.length * 4 + 4;

  // --- ITEMS TABLE ---
  const tableColumn = ["Item", "Qty", "Price"];
  const tableRows = [];

  order.orderItems.forEach((item) => {
    let itemName = item.name;
    // Append variant/addons to name
    if (item.selectedVariant) itemName += ` (${item.selectedVariant.name})`;
    if (item.selectedAddons && item.selectedAddons.length > 0)
      itemName += " + Addons";

    const itemData = [itemName, item.qty, `Rs.${item.price}`];
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
      0: { cellWidth: 40 }, // Item Name Width
      1: { cellWidth: 10, halign: "center" }, // Qty Width
      2: { cellWidth: 20, halign: "right" }, // Price Width
    },
    margin: { left: 5, right: 5 },
  });

  // Calculate new Y position after table
  yPos = doc.lastAutoTable.finalY + 5;

  // --- TOTALS ---
  doc.line(5, yPos, pageWidth - 5, yPos); // Divider Line
  yPos += 5;

  doc.setFontSize(9);
  doc.text("Subtotal:", 5, yPos);
  doc.text(`Rs.${order.itemsPrice}`, pageWidth - 5, yPos, { align: "right" });
  yPos += 5;

  doc.text("Tax (5%):", 5, yPos);
  doc.text(`Rs.${order.taxPrice}`, pageWidth - 5, yPos, { align: "right" });
  yPos += 5;

  doc.text("Delivery:", 5, yPos);
  doc.text(`Rs.${order.shippingPrice}`, pageWidth - 5, yPos, {
    align: "right",
  });
  yPos += 6;

  // Grand Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 5, yPos);
  doc.text(`Rs.${order.totalPrice}`, pageWidth - 5, yPos, { align: "right" });
  yPos += 10;

  // --- FOOTER ---
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for ordering!", pageWidth / 2, yPos, { align: "center" });

  // Payment Status
  yPos += 5;
  doc.setFont("helvetica", "bold");
  const paymentStatus =
    order.paymentMethod === "COD" ? "To Pay (COD)" : "PAID ONLINE";
  doc.text(paymentStatus, pageWidth / 2, yPos, { align: "center" });

  // Save the PDF
  doc.save(`Invoice_${order._id.slice(-6)}.pdf`);
};
