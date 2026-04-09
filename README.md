# CS2 Trading Tracker

Tracks profit of CS2 items.

## Background

I have been trading in CS2 since 2014 as a hobby. Since i got into programming i wanted to find a way to merge two interests and built this application for more professional and faster tracking of exchanging CS2 items. 

## Features

* **Item Management**: Add items with purchase price, date purchased, platform (e.g., CSFloat, Youpin), and notes explaining what is special about the item.
* **Automatic Profit Calculation**: The app calculates net profit after deducting platform-specific selling fees.
* **Currency Conversion**: Fetches real-time exchange rates via API to convert between USD and RMB (CNY).
* **Statistics**: A dashboard showing total profit, total invested capital, and the number of sold vs. active items.
* **History and Charts**: Visualizes profit trends over time using Recharts and allows sorting by criteria like profitability.
* **Export**: Option to download all entry data as a CSV file for backup or external use.
* **Themes**: Built-in support for different visual themes that are saved in the browser's local storage.

- **Upcoming**: Automatically receive updates in your inventory (Items entering or leaving your inventory) using Steam-API.

## Tech Stack

* **Frontend**: React (JavaScript)
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **Charts**: Recharts
* **Data**: LocalStorage (no database required to run the app locally)

## Installation

1.  Clone the repository.
2.  Run `npm install` to download all dependencies.
3.  Start the development server with `npm run dev`.

## Structure

Currently, most of the logic resides in `App.js`, but I have started breaking certain parts out, such as `StatsCards.jsx`, to make the code more modular. Future plans include further componentization and moving the sales logic into dedicated hooks or functions.


*Developed by Dvichen*
