import jsPDF from 'jspdf';
import { RepairGuide } from '@/types/repair'; 

/**
 * Generates an IKEA/Manual-style PDF instruction guide
 * Matches the clean, minimalist aesthetic of professional service manuals.
 */
export function generatePDF(guide: RepairGuide, deviceImage?: string | null): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = width - (margin * 2);

    // --- Helper: Draw Warning Box ---
    const drawWarningBox = (y: number, warningText: string): number => {
      const boxColor = '#FFF9E6'; // Light yellow
      const borderColor = '#F59E0B'; // Amber/Orange
      const textColor = '#4B5563'; // Slate 600

      doc.setFillColor(boxColor);
      doc.setDrawColor(borderColor);
      doc.setLineWidth(0.5);
      
      // Calculate text height
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const textLines = doc.splitTextToSize(warningText, contentWidth - 25); // padding for icon
      const boxHeight = Math.max(15, (textLines.length * 5) + 10);

      // Draw Box
      doc.roundedRect(margin, y, contentWidth, boxHeight, 0.5, 0.5, 'FD');

      // Draw Warning Icon (Triangle + Exclamation)
      const iconSize = 6;
      const iconX = margin + 8;
      const iconY = y + (boxHeight / 2);
      
      doc.setFillColor(borderColor); // Amber fill for icon
      doc.setDrawColor(borderColor);
      
      // Triangle path
      doc.triangle(
        iconX, iconY - (iconSize/2), // top
        iconX - (iconSize/2), iconY + (iconSize/2), // bottom left
        iconX + (iconSize/2), iconY + (iconSize/2), // bottom right
        'F'
      );

      // Exclamation mark (white)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('!', iconX, iconY + 2, { align: 'center' });

      // Warning Text
      doc.setTextColor(0, 0, 0); // Black for title
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('CAUTION:', margin + 18, y + 6);

      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'normal');
      doc.text(textLines, margin + 18, y + 11);

      return boxHeight;
    };

    // --- Helper: Draw Single Safety Item (Container) ---
    const drawSafetyItem = (y: number, text: string): number => {
       const boxColor = '#FEF2F2'; // Light red
       const borderColor = '#EF4444'; // Red
       const textColor = '#B91C1C'; // Dark Red

       doc.setFillColor(boxColor);
       doc.setDrawColor(borderColor);
       doc.setLineWidth(0.5);
       
       // Calculate text height
       doc.setFontSize(11);
       doc.setFont('helvetica', 'bold'); // Bold text for impact
       const textLines = doc.splitTextToSize(text, contentWidth - 25);
       const boxHeight = Math.max(18, (textLines.length * 7) + 10);

       // Draw Container
       doc.roundedRect(margin, y, contentWidth, boxHeight, 1, 1, 'FD');

       // Draw Safety Icon (Warning Triangle)
       const iconSize = 6;
       const iconX = margin + 10;
       const iconY = y + (boxHeight / 2);

       doc.setFillColor(borderColor); 
       doc.triangle(
          iconX, iconY - (iconSize/2), 
          iconX - (iconSize/2), iconY + (iconSize/2), 
          iconX + (iconSize/2), iconY + (iconSize/2), 
          'F'
       );
       
       doc.setTextColor(255, 255, 255);
       doc.setFontSize(8);
       doc.text('!', iconX, iconY + 2, { align: 'center' });

       // Text
       doc.setTextColor(textColor);
       doc.setFontSize(11);
       doc.setFont('helvetica', 'bold');
       
       // Center vertically logic:
       // Calculate height of text block
       const textBlockHeight = textLines.length * 6; // Approximate height per line
       // Calculate centered Y position. jsPDF text baseline is approx bottom, so add correction.
       const textY = y + (boxHeight / 2) - (textBlockHeight / 2) + 5; // Adjusted offset
       
       // Center text horizontally
       // For each line, calculate x position
       textLines.forEach((line: string, i: number) => {
         // Use doc.getStringUnitWidth to get width, then scale by font size
         const textW = doc.getStringUnitWidth(line) * 11 / doc.internal.scaleFactor * 2.8; 
         // A simpler way in jsPDF is to use 'align: center' in text options, but we need x coordinate.
         // Actually, let's use the align option.
         
         // Wait, splitTextToSize returns lines that fit width.
         // If we want centered text, we should just use doc.text with align: center at the midpoint of the box.
       });
       
       // Since we have multiple lines from splitTextToSize, standard align:center might treat the whole block.
       // Let's retry with simple text placement.
       
       // Box center X
       const boxCenterX = margin + (contentWidth / 2);
       
       // We must pass the text lines and use align: 'center'
       doc.text(textLines, boxCenterX, textY, { align: 'center' });

       return boxHeight;
    };

    // --- 1. COVER PAGE ---
    
    // Blue Background #b0d4f0
    doc.setFillColor('#b0d4f0');
    doc.rect(0, 0, width, height, 'F');
    
    // Title Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(60); // Massive Font for "REPAIR GUIDE"
    doc.setTextColor(0, 0, 0);
    doc.text('REPAIR GUIDE', width / 2, 60, { align: 'center' });

    // Device Name (Smaller, Normal weight)
    doc.setFont('helvetica', 'normal'); 
    doc.setFontSize(20); 
    doc.setTextColor(40, 40, 40);
    doc.text(guide.device_name.toUpperCase(), width / 2, 80, { align: 'center' });

    // Device Image (Center)
    if (deviceImage) {
      try {
        // Fit image within a box (e.g., 140x140)
        const imgProps = doc.getImageProperties(deviceImage);
        const imgRatio = imgProps.width / imgProps.height;
        let imgW = 140;
        let imgH = 140;
        
        if (imgRatio > 1) {
          imgH = imgW / imgRatio;
        } else {
          imgW = imgH * imgRatio;
        }
        
        // Add white border/background behind image for pop
        doc.setFillColor(255, 255, 255);
        doc.roundedRect((width - imgW)/2 - 5, 100 - 5, imgW + 10, imgH + 10, 2, 2, 'F');
        
        doc.addImage(deviceImage, 'JPEG', (width - imgW) / 2, 100, imgW, imgH);
      } catch (e) {
        console.warn('Could not add cover image', e);
      }
    } else {
      // Placeholder Box
      doc.setDrawColor(255, 255, 255);
      doc.setFillColor(255, 255, 255);
      doc.rect((width - 120) / 2, 100, 120, 120, 'F');
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(12);
      doc.text('No Device Image', width / 2, 160, { align: 'center' });
    }

    // Footer Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22); // Bigger Font per request
    doc.setTextColor(0, 0, 0);
    doc.text('Technical Disassembly & Service Manual', width / 2, height - 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text('Generated by REPAIRLENS', width / 2, height - 20, { align: 'center' });


    // --- 2. SAFETY PAGE ---
    if (guide.safety && guide.safety.length > 0) {
      doc.addPage();
      doc.setFillColor('#ffffff'); // Beige background
      doc.rect(0, 0, width, height, 'F');

      // Centered Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(185, 28, 28); // Red Title
      doc.text('SAFETY PRECAUTIONS', width / 2, 40, { align: 'center' });
      
      // Centered Underline
      doc.setDrawColor(185, 28, 28);
      doc.setLineWidth(1);
      doc.line(width / 2 - 60, 45, width / 2 + 60, 45);
      
      let safetyY = 65;
      
      guide.safety.forEach(item => {
         // Draw individual container for each item
         const height = drawSafetyItem(safetyY, item);
         safetyY += height + 8; // Gap between items
      });
    }

    // --- 3. STEPS PAGES ---
    
    guide.steps.forEach((step, index) => {
      doc.addPage();
      
      // Set Background Color #ffffff
      doc.setFillColor('#ffffff');
      doc.rect(0, 0, width, height, 'F');

      // -- Centered Header --
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24); // Bigger Title
      doc.setTextColor(0, 0, 0);
      
      // Just "STEP [N]"
      const stepTitle = `STEP ${step.step_number}`; 
      doc.text(stepTitle, width / 2, 25, { align: 'center' });
      
      // Horizontal Line (Centered)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, 32, width - margin, 32);

      // -- Visual Area --
      // Removed the floating circle number since title is now centered and big
      
      // Image Area - Centered
      const imgY = 45;
      const imgH = 110; // Bigger image area
      const imgW = 160; 
      const imgX = (width - imgW) / 2;

      // Draw Image Box Background
      doc.setFillColor(255, 255, 255); // White background for image
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(imgX, imgY, imgW, imgH, 'FD');

      if (step.image) {
        try {
          doc.addImage(step.image, 'JPEG', imgX, imgY, imgW, imgH, undefined, 'FAST');
        } catch (e) {
           doc.setTextColor(200, 200, 200);
           doc.setFontSize(10);
           doc.text('[Step Image]', width / 2, imgY + (imgH/2), { align: 'center' });
        }
      } else {
         doc.setTextColor(200, 200, 200);
         doc.setFontSize(12);
         doc.text('[Visual Guide]', width / 2, imgY + (imgH/2), { align: 'center' });
      }

      let currentY = imgY + imgH + 25;

      // -- Instructions --
      // Instruction Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Instructions:', margin, currentY);
      currentY += 10;

      // Instruction Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13); // Readable text size
      doc.setTextColor(0, 0, 0); 
      
      // Split instruction into sentences for bullet points
      // Regex Lookbehind is not fully supported in all JS environments, so we use a safer split.
      // We split by period/question/exclamation followed by space or end of line.
      // We then try to merge back common abbreviations if needed, but a simple robust way is:
      // Match sequence of characters ending in punctuation, followed by space/EOF.
      
      // This regex matches a sentence: non-punctuation chars, followed by optional punctuation, 
      // but checks that the period isn't part of a known abbreviation like e.g. or i.e. is hard with simple regex.
      // Instead, let's use a simpler heuristic: Split, then rejoin if it looks like an abbreviation.
      
      let sentences = step.instruction.match( /[^.!?]+[.!?]+(\s|$)/g );
      
      if (!sentences) {
          sentences = [step.instruction];
      } else {
          // Post-processing to fix common abbreviation splits (e.g., i.e.)
          for (let i = 0; i < sentences.length - 1; i++) {
              const current = sentences[i].trim();
              // Check if ends with short abbreviation pattern (like "e.g." or "approx.")
              // If the sentence is very short (<= 4 chars) or ends in "e.g." "i.e.", merge with next.
              if (/(e\.g\.|i\.e\.|vs\.|etc\.)$/i.test(current) || current.length <= 3) {
                  sentences[i] = sentences[i] + sentences[i+1];
                  sentences.splice(i + 1, 1);
                  i--; // re-check this new merged sentence
              }
          }
      }
      
      sentences.forEach((sentence) => {
         const cleanSentence = sentence.trim();
         if (!cleanSentence) return;

         // Split this sentence into lines that fit width
         // Reduced width for bullet indentation
         const textWidth = contentWidth - 10; 
         const lines = doc.splitTextToSize(cleanSentence, textWidth);
         
         // Draw Bullet
         doc.text('•', margin, currentY);
         
         // Draw Lines
         doc.text(lines, margin + 8, currentY);
         
         // Increment Y
         currentY += (lines.length * 7) + 4; // Line height + paragraph spacing
      });

      currentY += 10;

      // -- Warning (if exists) --
      if (step.warning) {
        const boxH = drawWarningBox(currentY, step.warning);
        currentY += boxH + 10;
      }

      // -- Tools (if exists) --
      if (step.tools_needed && step.tools_needed.length > 0) {
        currentY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('TOOLS REQUIRED:', margin, currentY);
        
        doc.setFont('helvetica', 'normal');
        const toolsText = step.tools_needed.join(', ');
        doc.text(toolsText, margin + 45, currentY);
      }

    });

    // Save
    const sanitizedName = guide.device_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${sanitizedName}_manual.pdf`);
    
    return true;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return false;
  }
}
