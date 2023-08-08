import json
import pandas as pd
import re

# Load the JSON data
with open('contact_data.json', 'r') as f:
    data = json.load(f)

# Define a function to split names
def split_name(name):
    parts = name.split()
    first_name = parts[0]
    last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
    return first_name, last_name

# Define a function to standardize phone numbers
def standardize_phone(phone):
    # Remove all non-numeric characters
    digits = re.sub(r'\D', '', phone)
    # Return in the format (XXX) XXX-XXXX
    return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"

# Process the data
cleaned_data = []
for record in data:
    first_name, last_name = split_name(record['name'])
    phone = standardize_phone(record['phone'])
    
    # Use AI to recognize addresses (for simplicity, using a regex here)
    # Ideally, you'd use a more sophisticated model for this
    address = ' '.join(re.findall(r'\d+\s[A-z]+\s[A-z]+', record['address']))
    
    cleaned_data.append({
        'First Name': first_name,
        'Last Name': last_name,
        'Phone': phone,
        'Address': address
    })

# Convert to a DataFrame and write to Excel
df = pd.DataFrame(cleaned_data)
df.to_excel('cleaned_contact_data.xlsx', index=False)
