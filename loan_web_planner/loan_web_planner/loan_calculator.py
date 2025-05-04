# loan_calculator.py
import copy
import math

def simulate_repayment(initial_loans, total_monthly_payment, strategy_allocation_function):
    loans = copy.deepcopy(initial_loans)
    total_interest_paid = 0.0
    months = 0

    while any(loan["balance"] > 0 for loan in loans):
        months += 1
        monthly_interest = 0.0
        total_min_payments = 0.0

        # Step 1: Apply interest & calculate total min payments
        for loan in loans:
            if loan["balance"] <= 0:
                continue
            monthly_rate = loan["rate"] / 100 / 12
            interest = loan["balance"] * monthly_rate
            loan["balance"] += interest
            monthly_interest += interest
            total_interest_paid += interest

            # Subtract minimum payment from loan
            payment = min(loan["min_payment"], loan["balance"])
            loan["balance"] -= payment
            total_min_payments += payment

        # Step 2: Extra payment allocation
        extra_payment = total_monthly_payment - total_min_payments
        if extra_payment > 0:
            strategy_allocation_function(loans, extra_payment)

        # Step 3: Avoid infinite loop on small balances
        if months > 1000:  # safety net
            break

    return months, total_interest_paid


def allocate_extra_avalanche(active_loans, extra_payment):
    # Sort by highest interest rate first
    active_loans.sort(key=lambda loan: (-loan["rate"], loan["balance"]))
    for loan in active_loans:
        if loan["balance"] <= 0:
            continue
        pay_amount = min(extra_payment, loan["balance"])
        loan["balance"] -= pay_amount
        extra_payment -= pay_amount
        if extra_payment <= 0:
            break


def allocate_extra_snowball(active_loans, extra_payment):
    # Sort by lowest balance first
    active_loans.sort(key=lambda loan: (loan["balance"], -loan["rate"]))
    for loan in active_loans:
        if loan["balance"] <= 0:
            continue
        pay_amount = min(extra_payment, loan["balance"])
        loan["balance"] -= pay_amount
        extra_payment -= pay_amount
        if extra_payment <= 0:
            break
