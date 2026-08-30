import { TaxEvent } from './FifoTaxCalculator';

export class CsvExporter {
  /**
   * Generates a standard IRS-friendly CSV string from an array of TaxEvents.
   * Format approximates IRS Form 8949 (Sales and Other Dispositions of Capital Assets).
   */
  static generateCsvString(events: TaxEvent[]): string {
    const headers = [
      'Asset',
      'Amount',
      'Date Acquired',
      'Date Sold',
      'Proceeds (USD)',
      'Cost Basis (USD)',
      'Gain/Loss (USD)',
      'Term/Type'
    ];

    const rows = events.map(e => [
      e.asset,
      e.amount.toString(),
      e.dateAcquired.split('T')[0], // Extract just the YYYY-MM-DD
      e.dateSold.split('T')[0],
      e.proceeds.toFixed(2),
      e.costBasis.toFixed(2),
      e.gainLoss.toFixed(2),
      e.term
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\\n');

    return csvContent;
  }

  /**
   * Triggers a browser file download of the CSV data.
   */
  static downloadCsv(events: TaxEvent[], filename = 'cryptoviz_tax_report.csv'): void {
    const csvString = this.generateCsvString(events);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Create a hidden anchor tag to trigger the download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
