# app.py
from flask import Flask, render_template, request, jsonify
import loan_calculator # Import our calculation logic

app = Flask(__name__)

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    """Receives loan data, runs simulation, and returns results."""
    try:
        data = request.get_json()

        # --- Data Extraction and Basic Validation ---
        loans_data = data.get('loans', [])
        budget_str = data.get('budget', '0')

        if not loans_data:
            return jsonify({'error': 'No loan data provided.'}), 400

        try:
            payment_budget = float(budget_str)
            if payment_budget <= 0:
                 raise ValueError("Budget must be positive.")
        except ValueError as e:
            return jsonify({'error': f'Invalid budget input: {e}'}), 400

        processed_loans = []
        total_min_payments = 0
        for i, loan in enumerate(loans_data):
             try:
                 name = loan.get('name', f'Loan {i+1}')
                 balance = float(loan.get('balance', '0'))
                 rate = float(loan.get('rate', '0'))
                 min_payment = float(loan.get('min_payment', '0'))

                 if balance <= 0 or rate < 0 or min_payment <= 0:
                      raise ValueError(f"Invalid numeric value in Loan {i+1} (balance/min_payment > 0, rate >= 0)")

                 # Add warning check back if desired
                 # if min_payment < (balance * (rate / 100 / 12)):
                 #    app.logger.warning(f"Min payment low for loan {name}")

                 processed_loans.append({
                     "name": name,
                     "balance": balance,
                     "rate": rate,
                     "min_payment": min_payment
                 })
                 total_min_payments += min_payment
             except (ValueError, TypeError) as e:
                 return jsonify({'error': f'Invalid data for Loan {i+1}: {e}'}), 400


        if payment_budget < total_min_payments:
            return jsonify({'error': f'Budget ${payment_budget:.2f} is less than total minimum payments ${total_min_payments:.2f}.'}), 400

        # --- Run Simulations ---
        # Use the imported functions from loan_calculator
        avalanche_months, avalanche_interest = loan_calculator.simulate_repayment(
            processed_loans, payment_budget, loan_calculator.allocate_extra_avalanche
        )

        snowball_months, snowball_interest = loan_calculator.simulate_repayment(
            processed_loans, payment_budget, loan_calculator.allocate_extra_snowball
        )

        # --- Format Results ---
        results = {
            'avalanche': {
                'months': avalanche_months,
                'interest': round(avalanche_interest, 2),
                'years': avalanche_months // 12,
                'rem_months': avalanche_months % 12
            },
            'snowball': {
                'months': snowball_months,
                'interest': round(snowball_interest, 2),
                'years': snowball_months // 12,
                'rem_months': snowball_months % 12
            },
             'total_min_payments': round(total_min_payments, 2),
             'extra_payment': round(payment_budget - total_min_payments, 2)
        }

        return jsonify(results)

    except Exception as e:
        # Log the error for debugging on the server side
        app.logger.error(f"Calculation error: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred during calculation.'}), 500

if __name__ == '__main__':
    # Runs the development server
    # Debug=True automatically reloads changes and shows detailed errors in browser
    app.run(debug=True)