import { dates } from '/utils/dates'
import  OpenAI  from 'openai'
  // "description": "https://scrimba.com/the-ai-engineer-path-c02v/~03",


const tickersArr = []

const generateReportBtn = document.querySelector('.generate-report-btn')

generateReportBtn.addEventListener('click', fetchStockData)

document.getElementById('ticker-input-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const tickerInput = document.getElementById('ticker-input')
    if (tickerInput.value.length > 2) {
        generateReportBtn.disabled = false
        const newTickerStr = tickerInput.value
        tickersArr.push(newTickerStr.toUpperCase())
        tickerInput.value = ''
        renderTickers()
    } else {
        const label = document.getElementsByTagName('label')[0]
        label.style.color = 'red'
        label.textContent = 'You must add at least one ticker. A ticker is a 3 letter or more code for a stock. E.g TSLA for Tesla.'
    }
})

function renderTickers() {
    const tickersDiv = document.querySelector('.ticker-choice-display')
    tickersDiv.innerHTML = ''
    tickersArr.forEach((ticker) => {
        const newTickerSpan = document.createElement('span')
        newTickerSpan.textContent = ticker
        newTickerSpan.classList.add('ticker')
        tickersDiv.appendChild(newTickerSpan)
    })
}

const loadingArea = document.querySelector('.loading-panel')
const apiMessage = document.getElementById('api-message')

async function fetchStockData() {
    document.querySelector('.action-panel').style.display = 'none'
    loadingArea.style.display = 'flex'
    try {
        const stockData = await Promise.allSettled(
            tickersArr.map(async (ticker) => {
                const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dates.startDate}/${dates.endDate}?apiKey=${import.meta.env.VITE_POLYGON_API_KEY}`;
                
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    apiMessage.innerText = 'Creating report...';
                    return data;
                } else {
                    throw new Error(`Error fetching ${ticker}: ${response.status}`);
                }
            })
        );

        // Keep only fulfilled results
        const results = stockData
            .filter(r => r.status === "fulfilled")
            .map(r => r.value);

        if (results.length > 0) {
            fetchReport(results);
        } else {
            loadingArea.innerText = 'No stock data could be fetched.';
        }
    } catch (err) {
        loadingArea.innerText = 'There was an error fetching stock data.';
        console.error('error: ', err);
    }
}

async function fetchReport(data) {
  const summary = summarizeData(data);

  const messages = [
    {
      role: 'system',
      content: "You are Jordan Belfort, the Wolf of Wall Street. Give sharp, persuasive financial advice under 150 words. Sound bold, confident, and high-energy. Analyze stock data from the last 3 days, summarize performance, then give a clear BUY, HOLD, or SELL call."
    },
    {
      role: 'user',
      content: summary
    }
  ];

  try {
    const openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // cheaper & faster than gpt-4
      messages,
      temperature: 0.9
    });

    renderReport(response.choices[0].message.content.trim());
  } catch (err) {
    console.error('Error:', err);
    loadingArea.innerText = 'Unable to access AI. Please refresh and try again';
  }
}

function summarizeData(data) {
  return data.map(d => {
    const ticker = d.ticker;
    const results = d.results;
    if (!results || results.length < 2) return `${ticker}: Not enough data.`;

    const first = results[0].c;
    const last = results[results.length - 1].c;
    return `${ticker} moved from $${first} to $${last} in ${results.length} days.`;
  }).join("\n");
}


function renderReport(output) {
    loadingArea.style.display = 'none'
    const outputArea = document.querySelector('.output-panel')
    const report = document.createElement('p')
    outputArea.appendChild(report)
    report.textContent = output
    outputArea.style.display = 'flex'
}