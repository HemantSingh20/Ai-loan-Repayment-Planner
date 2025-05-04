// static/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    const loanForm = document.getElementById('loan-form');
    const loanInputsContainer = document.getElementById('loan-inputs-container');
    const addLoanBtn = document.getElementById('add-loan-btn');
    const resultsOutput = document.getElementById('results-output');
    const errorMessage = document.getElementById('error-message');
    const summaryDiv = document.getElementById('summary');

    // Function to add a new set of loan input fields
    const addLoanEntry = () => {
        const newLoanEntry = document.createElement('div');
        newLoanEntry.classList.add('loan-entry');
        newLoanEntry.innerHTML = `
            <input type="text" placeholder="Loan Name" class="loan-name" required>
            <input type="number" step="0.01" min="0.01" placeholder="Balance ($)" class="loan-balance" required>
            <input type="number" step="0.01" min="0" placeholder="Rate (%)" class="loan-rate" required>
            <input type="number" step="0.01" min="0.01" placeholder="Min. Payment ($)" class="loan-min-payment" required>
            <button type="button" class="remove-loan-btn">Remove</button>
        `;
        loanInputsContainer.appendChild(newLoanEntry);
        attachRemoveListener(newLoanEntry.querySelector('.remove-loan-btn'));
    };

    // Function to attach event listener to remove buttons
    const attachRemoveListener = (button) => {
        button.addEventListener('click', (e) => {
            // Prevent removing the very last loan entry
            if (loanInputsContainer.children.length > 1) {
                e.target.closest('.loan-entry').remove();
            } else {
                alert("You must have at least one loan.");
            }
        });
    };

    // Add event listener for the "Add Another Loan" button
    addLoanBtn.addEventListener('click', addLoanEntry);

    // Attach remove listener to the initial loan entry's remove button
    const initialRemoveBtn = loanInputsContainer.querySelector('.remove-loan-btn');
    if (initialRemoveBtn) {
        attachRemoveListener(initialRemoveBtn);
    }


    // Handle form submission
    loanForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default page reload

        // Clear previous results and errors
        resultsOutput.innerHTML = '';
        errorMessage.textContent = '';
        summaryDiv.innerHTML = '';

        // Collect loan data
        const loanEntries = loanInputsContainer.querySelectorAll('.loan-entry');
        const loans = [];
        let valid = true;
        loanEntries.forEach(entry => {
            const name = entry.querySelector('.loan-name').value.trim();
            const balance = entry.querySelector('.loan-balance').value;
            const rate = entry.querySelector('.loan-rate').value;
            const minPayment = entry.querySelector('.loan-min-payment').value;

            if (!name || !balance || !rate || !minPayment) {
                valid = false; // Basic check if fields are filled (HTML required handles most)
            }

            loans.push({
                name: name || 'Unnamed Loan', // Provide default if empty
                balance: parseFloat(balance),
                rate: parseFloat(rate),
                min_payment: parseFloat(minPayment)
            });
        });

        // Collect budget data
        const budget = document.getElementById('budget').value;

        if (!valid || !budget) {
             errorMessage.textContent = 'Please fill in all fields for loans and budget.';
             return;
        }


        // Prepare data for backend
        const dataToSend = {
            loans: loans,
            budget: parseFloat(budget)
        };

        // Send data to Flask backend
        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend),
            });

            const results = await response.json();

            if (!response.ok) {
                // Display error message from backend
                errorMessage.textContent = `Error: ${results.error || 'Calculation failed.'}`;
            } else {
                // Display successful results
                 summaryDiv.innerHTML = `
                    <p>Total Minimum Payments: $${results.total_min_payments.toFixed(2)}</p>
                    <p>Your Budget: $${parseFloat(budget).toFixed(2)}</p>
                    <p>Extra Payment Applied Monthly: $${results.extra_payment.toFixed(2)}</p>
                `;

                resultsOutput.innerHTML = `
                    <h3>Results Breakdown</h3>
                    <div>
                        <h4>Debt Avalanche (Highest Interest First)</h4>
                        <p>Payoff Time: ${results.avalanche.years} years, ${results.avalanche.rem_months} months (${results.avalanche.months} total months)</p>
                        <p>Total Interest Paid: $${results.avalanche.interest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <hr>
                    <div>
                        <h4>Debt Snowball (Lowest Balance First)</h4>
                        <p>Payoff Time: ${results.snowball.years} years, ${results.snowball.rem_months} months (${results.snowball.months} total months)</p>
                        <p>Total Interest Paid: $${results.snowball.interest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                `;
                 // Add recommendation logic here based on results (similar to CLI version)
                 addRecommendation(results);
            }

        } catch (error) {
            console.error('Error sending data:', error);
            errorMessage.textContent = 'An error occurred while communicating with the server.';
        }
    });

    // Function to add recommendation text
    const addRecommendation = (results) => {
        let recommendationHTML = '<h3>Recommendation</h3>';
        const avInterest = results.avalanche.interest;
        const snInterest = results.snowball.interest;
        const avMonths = results.avalanche.months;
        const snMonths = results.snowball.months;

        if (avInterest < snInterest) {
            recommendationHTML += "<p><strong>Debt Avalanche</strong> is recommended for saving the most money.</p>";
            recommendationHTML += `<p>It saves approximately <strong>$${(snInterest - avInterest).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> in interest compared to Snowball.</p>`;
        } else if (snInterest < avInterest) {
            recommendationHTML += "<p><strong>Debt Snowball</strong> results in slightly less interest in this scenario (uncommon, check inputs).</p>";
             recommendationHTML += `<p>It saves approximately <strong>$${(avInterest - snInterest).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> in interest.</p>`;
        } else {
            recommendationHTML += "<p>Both methods result in the <strong>same total interest paid</strong>.</p>";
        }

        if (snMonths < avMonths) {
            recommendationHTML += `<p><strong>Debt Snowball</strong> pays off all loans <strong>${avMonths - snMonths} months sooner</strong>, which can be motivating.</p>`;
        } else if (avMonths < snMonths) {
             recommendationHTML += `<p><strong>Debt Avalanche</strong> pays off all loans <strong>${snMonths - avMonths} months sooner</strong> in this case.</p>`;
        } else {
            recommendationHTML += "<p>Both methods take the <strong>same amount of time</strong> to pay off all loans.</p>";
        }
         resultsOutput.innerHTML += `<hr>${recommendationHTML}`;
    };

}); // End DOMContentLoaded