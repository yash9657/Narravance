import pandas as pd
import numpy as np

np.random.seed(42)

def simulate_price(n, low=10000, high=50000):
    return np.random.randint(low, high, size=n)

# --- Process JSON file ---
# Read the JSON file
json_path = './cars.json'
df_json = pd.read_json(json_path)

# Rename columns to standard names:
# - "Miles_per_Gallon" -> "mpg"
# - "Cylinders" -> "cylinders"
# - "Displacement" -> "displacement"
# - "Horsepower" -> "horsepower"
# - "Weight_in_lbs" -> "weight"
# - "Acceleration" -> "acceleration"
# - "Year" -> "sale_date" (and convert to datetime)
# - "Name" -> "name"
# - "Origin" -> "origin"
df_json = df_json.rename(columns={
    'Miles_per_Gallon': 'mpg',
    'Cylinders': 'cylinders',
    'Displacement': 'displacement',
    'Horsepower': 'horsepower',
    'Weight_in_lbs': 'weight',
    'Acceleration': 'acceleration',
    'Year': 'sale_date',
    'Name': 'name',
    'Origin': 'origin'
})
df_json['sale_date'] = pd.to_datetime(df_json['sale_date'], errors='coerce')

# Add simulated price column
df_json['price'] = simulate_price(len(df_json))

df_json['company'] = df_json['name'].str.split().str[0].str.title()

# --- Process CSV file ---
csv_path = './mpg.csv'
df_csv = pd.read_csv(csv_path)

df_csv = df_csv.rename(columns={'model_year': 'sale_date'})

# Convert sale_date: In the CSV, sale_date is given as a number (like 70 for 1970).
# We'll convert it to a string date "1970-01-01" then to datetime.
df_csv['sale_date'] = df_csv['sale_date'].apply(lambda x: f"19{int(x):02d}-01-01")
df_csv['sale_date'] = pd.to_datetime(df_csv['sale_date'], errors='coerce')

df_csv['price'] = simulate_price(len(df_csv))

df_csv['company'] = df_csv['name'].str.split().str[0].str.title()

# --- Standardize column order across both dataframes ---
target_cols = ['company', 'name', 'mpg', 'cylinders', 'displacement', 'horsepower',
               'weight', 'acceleration', 'sale_date', 'price', 'origin']

df_json = df_json[[col for col in target_cols if col in df_json.columns]]
df_csv = df_csv[[col for col in target_cols if col in df_csv.columns]]

# --- Combine the datasets ---
df_combined = pd.concat([df_json, df_csv], ignore_index=True)

df_combined = df_combined.sort_values(by='sale_date')

output_path = './unified_cars.csv'
df_combined.to_csv(output_path, index=False)

print(f"Unified data saved to {output_path}.")
