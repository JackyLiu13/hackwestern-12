import jsPDF from 'jspdf';
// Assuming these types exist in your project, otherwise define them here
import { RepairGuide } from '@/types/repair'; 

/**
 * Generates an IKEA-style PDF instruction manual from repair guide steps
 */
export function generatePDF(guide: RepairGuide): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // --- 1. Cover Page (Page 1) ---
    doc.setFillColor(0, 102, 204); // Blue background
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('Repair Guide', pageWidth / 2, pageHeight / 2 - 20, {
      align: 'center',
    });

    doc.setFontSize(24);
    doc.setFont('helvetica', 'normal');
    doc.text(guide.device_name, pageWidth / 2, pageHeight / 2, {
      align: 'center',
    });

    if (guide.difficulty) {
      doc.setFontSize(16);
      doc.text(`Difficulty: ${guide.difficulty}`, pageWidth / 2, pageHeight / 2 + 15, {
        align: 'center',
      });
    }

    // Add Date
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 20, {
      align: 'center',
    });

    // --- 2. Tools Page (Optional, Page 2) ---
    if (guide.tools_needed && guide.tools_needed.length > 0) {
      doc.addPage(); // Start fresh page for Tools
      
      doc.setFillColor(255, 255, 255);
      doc.setTextColor(0, 0, 0);
      
      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Tools Needed', margin, margin + 15);
      
      // Tools list
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      let yPos = margin + 35;
      
      guide.tools_needed.forEach((tool, index) => {
        // Check for page overflow within the tools list
        if (yPos > pageHeight - margin) {
          doc.addPage();
          yPos = margin + 15;
        }

        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
        
        doc.text(`${index + 1}.`, margin + 3, yPos);
        doc.text(tool, margin + 15, yPos);
        
        yPos += 12;
      });
    }

    // --- 3. Steps Pages (One step per page) ---
    guide.steps.forEach((step, index) => {
      // Simply add a page at the start of every step.
      doc.addPage();

      doc.setFillColor(255, 255, 255);
      doc.setTextColor(0, 0, 0);

      // Large step number (IKEA style - big and prominent)
      doc.setFillColor(0, 102, 204);
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      
      const circleSize = 20;
      const circleX = margin;
      const circleY = margin + 10;
      
      doc.circle(circleX + circleSize/2, circleY + circleSize/2, circleSize/2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(
        step.step_number.toString(),
        circleX + circleSize/2,
        circleY + circleSize/2 + 1,
        { align: 'center' }
      );

      // Step title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(step.title, margin + circleSize + 10, margin + 20);

      // Visual placeholder area (where image would go)
      const imageAreaHeight = 80;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, margin + 30, contentWidth, imageAreaHeight, 'F');
      doc.rect(margin, margin + 30, contentWidth, imageAreaHeight, 'S');
      
      // Placeholder text
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text('[Visual Guide]', pageWidth / 2, margin + 30 + imageAreaHeight / 2, {
        align: 'center',
      });

      // Instructions
      let yPos = margin + 30 + imageAreaHeight + 15;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Instructions:', margin, yPos);
      
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // FIXED: Removed 'step.description' as it does not exist on your Type definition.
      const instructionText = step.instruction || "Follow the visual guide.";
      
      const instructionLines = doc.splitTextToSize(instructionText, contentWidth);
      doc.text(instructionLines, margin, yPos);
      yPos += instructionLines.length * 7;

      // Tools needed for this specific step
      if (step.tools_needed && step.tools_needed.length > 0) {
        yPos += 5;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Tools:', margin, yPos);
        
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(step.tools_needed.join(', '), margin, yPos);
        yPos += 10;
      }

      // Warning
      if (step.warning) {
        yPos += 5;
        doc.setFillColor(255, 243, 205);
        doc.setDrawColor(255, 193, 7);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos - 5, contentWidth, 12, 2, 2, 'F');
        doc.roundedRect(margin, yPos - 5, contentWidth, 12, 2, 2, 'S');
        
        doc.setTextColor(133, 88, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠ Warning:', margin + 3, yPos + 2);
        
        doc.setFont('helvetica', 'normal');
        doc.text(step.warning, margin + 25, yPos + 2);
      }
    });

    // Generate filename
    const sanitizedName = guide.device_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedName}_repair_guide.pdf`;
    
    // Save PDF
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return false;
  }
}