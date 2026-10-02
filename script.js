const CRYPTO_IDS = ["bitcoin", "ethereum", "tether", "ripple", "dogecoin"];

const amountInput = document.getElementById("amountInput");
const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");
const convertedAmount = document.getElementById("convertedAmount");
const cryptoGrid = document.getElementById("cryptoGrid");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const swapBtn = document.getElementById("swapBtn");
const marketSentiment = document.getElementById("marketSentiment");
const topGainer = document.getElementById("topGainer");
const topLoser = document.getElementById("topLoser");
const lastUpdated = document.getElementById("lastUpdated");

let exchangeRates = {};
let cryptoMarket = [];

// Full currency names mapping
const currencyNames = {
  GBP: "British Pound (UK)",
  USD: "US Dollar (United States)",
  PKR: "Pakistani Rupee (Pakistan)",
  EUR: "Euro (Europe)",
  INR: "Indian Rupee (India)",
  AED: "UAE Dirham (Dubai/UAE)",
  SAR: "Saudi Riyal (Saudi Arabia)",
  CAD: "Canadian Dollar (Canada)",
  AUD: "Australian Dollar (Australia)",
  CNY: "Chinese Yuan (China)",
  JPY: "Japanese Yen (Japan)",
  TRY: "Turkish Lira (Turkey)",
  BDT: "Bangladeshi Taka (Bangladesh)",
  KWD: "Kuwaiti Dinar (Kuwait)",
  QAR: "Qatari Riyal (Qatar)",
  OMR: "Omani Rial (Oman)",
  BHD: "Bahraini Dinar (Bahrain)",
  MYR: "Malaysian Ringgit (Malaysia)",
  SGD: "Singapore Dollar (Singapore)",
  THB: "Thai Baht (Thailand)",
  RUB: "Russian Ruble (Russia)",
  ZAR: "South African Rand (South Africa)",
  AFN: "Afghan Afghani (Afghanistan)",
  IRR: "Iranian Rial (Iran)",
  IQD: "Iraqi Dinar (Iraq)"
};

// Priority currencies to show at top
const topPriorityCodes = ["USD", "GBP", "PKR", "EUR", "INR", "AED", "SAR", "CAD", "AUD"];

function formatCurrency(value, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function setLoadingState(isLoading) {
  refreshBtn.classList.toggle("loading", isLoading);
  refreshBtn.disabled = isLoading;
  refreshBtn.querySelector(".btn-label").textContent = isLoading ? "Refreshing..." : "Refresh Data";
}

function populateCurrencyOptions(rates) {
  const currentFrom = fromCurrency.value || "USD";
  const currentTo = toCurrency.value || "PKR";

  const allCodes = Object.keys(rates);
  
  // Separate top priority and remaining codes
  const priorityList = topPriorityCodes.filter(code => allCodes.includes(code));
  const otherList = allCodes.filter(code => !topPriorityCodes.includes(code)).sort();

  const sortedCodes = [...priorityList, ...otherList];

  const optionsHtml = sortedCodes
    .map((code) => {
      const name = currencyNames[code] ? ` - ${currencyNames[code]}` : "";
      return `<option value="${code}">${code}${name}</option>`;
    })
    .join("");

  fromCurrency.innerHTML = optionsHtml;
  toCurrency.innerHTML = optionsHtml;

  fromCurrency.value = sortedCodes.includes(currentFrom) ? currentFrom : "USD";
  toCurrency.value = sortedCodes.includes(currentTo) ? currentTo : "PKR";
}

function convertCurrency(amount, from, to) {
  if (!exchangeRates[from] || !exchangeRates[to] || !Number.isFinite(amount)) {
    return 0;
  }

  const usdValue = amount / exchangeRates[from];
  return usdValue * exchangeRates[to];
}

function updateConversionResult() {
  const amount = Number(amountInput.value) || 0;
  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (!exchangeRates[from] || !exchangeRates[to]) {
    convertedAmount.textContent = "--";
    return;
  }

  const converted = convertCurrency(amount, from, to);
  convertedAmount.textContent = `${formatCurrency(converted, to)}`;
}

async function fetchExchangeRates() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("Exchange rate fetch failed");

    const data = await res.json();
    exchangeRates = { ...data.rates, USD: 1 };

    populateCurrencyOptions(exchangeRates);
    updateConversionResult();
  } catch (error) {
    console.error(error);
    convertedAmount.textContent = "Rate unavailable";
  }
}

async function fetchCryptoData() {
  try {
    const query = CRYPTO_IDS.join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${query}&price_change_percentage=24h`
    );

    if (!res.ok) throw new Error("Crypto data fetch failed");

    const data = await res.json();
    cryptoMarket = data;
    renderCryptoCards();
    updateSummaryCards();
  } catch (error) {
    console.error(error);
    cryptoGrid.innerHTML = '<div class="coin-card empty">Unable to load live crypto data right now.</div>';
  }
}

function updateSummaryCards() {
  if (!cryptoMarket.length) return;

  const sortedByChange = [...cryptoMarket].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const sortedByLoss = [...cryptoMarket].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);

  const topGainerItem = sortedByChange[0];
  const topLoserItem = sortedByLoss[0];

  marketSentiment.textContent = cryptoMarket.every((coin) => coin.price_change_percentage_24h > 0) ? "Bullish" : "Mixed";
  topGainer.textContent = `${topGainerItem.symbol.toUpperCase()} ${topGainerItem.price_change_percentage_24h.toFixed(2)}%`;
  topLoser.textContent = `${topLoserItem.symbol.toUpperCase()} ${topLoserItem.price_change_percentage_24h.toFixed(2)}%`;
  lastUpdated.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getFilteredCryptoList() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) return cryptoMarket;

  return cryptoMarket.filter((coin) => {
    const name = coin.name.toLowerCase();
    const symbol = coin.symbol.toLowerCase();
    return name.includes(query) || symbol.includes(query);
  });
}

function renderCryptoCards() {
  const filtered = getFilteredCryptoList();

  if (!filtered.length) {
    cryptoGrid.innerHTML = '<div class="coin-card empty">No matching crypto or currency found.</div>';
    return;
  }

  cryptoGrid.innerHTML = filtered
    .map((coin) => {
      const change = Number(coin.price_change_percentage_24h || 0);
      const trendClass = change >= 0 ? "change-positive" : "change-negative";
      const trendLabel = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
      const price = formatCurrency(coin.current_price, "USD");

      return `
        <article class="coin-card">
          <div class="coin-header">
            <div class="coin-icon">
              <img src="${coin.image}" alt="${coin.name}" />
            </div>
            <div>
              <div class="coin-name">${coin.name}</div>
              <div class="coin-symbol">${coin.symbol}</div>
            </div>
          </div>

          <div class="coin-price">${price}</div>

          <div class="coin-footer">
            <span class="${trendClass}">${trendLabel}</span>
            <span>24h</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function refreshData() {
  setLoadingState(true);

  try {
    await Promise.all([fetchExchangeRates(), fetchCryptoData()]);
  } finally {
    setLoadingState(false);
  }
}

amountInput.addEventListener("input", updateConversionResult);
fromCurrency.addEventListener("change", updateConversionResult);
toCurrency.addEventListener("change", updateConversionResult);
searchInput.addEventListener("input", renderCryptoCards);

swapBtn.addEventListener("click", () => {
  const currentFrom = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = currentFrom;
  updateConversionResult();
});

refreshBtn.addEventListener("click", refreshData);

refreshData();
setInterval(refreshData, 60000);
