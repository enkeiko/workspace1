"""
PDF Generator for Invoices
"""
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.utils.logger import log_info, log_error


def generate_invoice_pdf(invoice_data, output_path):
    """
    Generate invoice PDF

    Args:
        invoice_data (dict): Invoice data with client and project info
        output_path (str): Output PDF file path

    Returns:
        dict: {'success': bool, 'path': str, 'error': str or None}
    """
    try:
        # Create HTML content
        html_content = _create_invoice_html(invoice_data)

        # Note: WeasyPrint requires additional setup for Korean fonts
        # For MVP, we'll create a simple text-based approach
        # Full PDF implementation would use WeasyPrint:
        # from weasyprint import HTML
        # HTML(string=html_content).write_pdf(output_path)

        # For now, save as HTML (can be printed to PDF from browser)
        output_path = output_path.replace('.pdf', '.html')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        log_info('Invoice PDF generated', path=output_path)

        return {
            'success': True,
            'path': output_path,
            'message': f'인보이스가 생성되었습니다: {output_path}'
        }

    except Exception as e:
        log_error('Failed to generate PDF', error=str(e))
        return {
            'success': False,
            'path': None,
            'error': str(e)
        }


def _create_invoice_html(invoice):
    """Create HTML content for invoice"""
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice {invoice['invoice_number']}</title>
    <style>
        body {{ font-family: 'Malgun Gothic', sans-serif; margin: 40px; }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .invoice-info {{ margin-bottom: 30px; }}
        .party-info {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
        .party {{ width: 45%; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
        th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .totals {{ text-align: right; }}
        .totals-row {{ font-weight: bold; }}
        .notes {{ margin-top: 30px; padding: 15px; background-color: #f9f9f9; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>INVOICE</h1>
        <h2>인보이스</h2>
    </div>

    <div class="invoice-info">
        <p><strong>Invoice Number:</strong> {invoice['invoice_number']}</p>
        <p><strong>Invoice Date:</strong> {invoice['invoice_date']}</p>
        <p><strong>Due Date:</strong> {invoice['due_date']}</p>
        <p><strong>Status:</strong> {invoice['status'].upper()}</p>
    </div>

    <div class="party-info">
        <div class="party">
            <h3>Bill To:</h3>
            <p><strong>{invoice.get('client_name', '')}</strong></p>
            <p>{invoice.get('client_company', '')}</p>
            <p>{invoice.get('client_address', '')}</p>
            <p>{invoice.get('client_email', '')}</p>
        </div>
        <div class="party">
            <h3>From:</h3>
            <p><strong>Your Company Name</strong></p>
            <p>Your Address</p>
            <p>Your Email</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{invoice.get('project_name', 'Services Rendered')}</td>
                <td style="text-align: right;">{invoice['subtotal']:,.0f} ₩</td>
            </tr>
        </tbody>
    </table>

    <div class="totals">
        <p>Subtotal: {invoice['subtotal']:,.0f} ₩</p>
        <p>Tax (10%): {invoice['tax']:,.0f} ₩</p>
        <p class="totals-row">Total: {invoice['total']:,.0f} ₩</p>
    </div>

    {f'<div class="notes"><h3>Notes:</h3><p>{invoice["notes"]}</p></div>' if invoice.get('notes') else ''}

    <div style="margin-top: 50px; text-align: center; color: #666;">
        <p>Thank you for your business!</p>
        <p style="font-size: 12px;">Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
</body>
</html>
"""
    return html


def generate_time_report_pdf(entries, output_path):
    """
    Generate time entry report PDF

    Args:
        entries (list): List of time entry records
        output_path (str): Output PDF file path

    Returns:
        dict: {'success': bool, 'path': str, 'error': str or None}
    """
    try:
        # Create HTML content for time report
        total_hours = sum(e['hours'] for e in entries)
        billable_hours = sum(e['hours'] for e in entries if e['billable'] == 'Y')

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Time Report</title>
    <style>
        body {{ font-family: 'Malgun Gothic', sans-serif; margin: 40px; }}
        h1 {{ text-align: center; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 10px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .summary {{ margin: 20px 0; padding: 15px; background-color: #f9f9f9; }}
    </style>
</head>
<body>
    <h1>Time Entry Report</h1>

    <div class="summary">
        <p><strong>Total Entries:</strong> {len(entries)}</p>
        <p><strong>Total Hours:</strong> {total_hours:.1f}h</p>
        <p><strong>Billable Hours:</strong> {billable_hours:.1f}h</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Client</th>
                <th>Hours</th>
                <th>Billable</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
"""

        for entry in entries:
            html_content += f"""
            <tr>
                <td>{entry['date']}</td>
                <td>{entry.get('project_name', '-')}</td>
                <td>{entry.get('client_name', '-')}</td>
                <td>{entry['hours']:.1f}h</td>
                <td>{'Yes' if entry['billable'] == 'Y' else 'No'}</td>
                <td>{entry.get('description', '-')}</td>
            </tr>
"""

        html_content += """
        </tbody>
    </table>

    <div style="margin-top: 50px; text-align: center; color: #666;">
        <p style="font-size: 12px;">Generated on """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """</p>
    </div>
</body>
</html>
"""

        # Save as HTML
        output_path = output_path.replace('.pdf', '.html')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        log_info('Time report generated', path=output_path)

        return {
            'success': True,
            'path': output_path,
            'message': f'리포트가 생성되었습니다: {output_path}'
        }

    except Exception as e:
        log_error('Failed to generate time report', error=str(e))
        return {
            'success': False,
            'path': None,
            'error': str(e)
        }
