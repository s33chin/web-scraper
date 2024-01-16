"""This script parses a JSON file containing contact data and writes the data to an Excel file."""

import json
import re
import pandas as pd
import spacy

with open('contact_data1_2.json', 'r', encoding="utf-8") as f:
    data = json.load(f)


nlp = spacy.load("en_core_web_sm")

def split_name(name):
    """function to split a name into first and last name using spaCy,regex"""
    cleaned_name = re.sub(r'\(([^)]+)\)', '', name)

    titles = ["Dr.", "Ms.", "Mr.", "PhD", "Mrs.", "Miss", "Mx.", "Prof.", "Dr", "Ms", "Mr",
              "PhD", "Mrs", "Miss", "Mx", "Prof", "P.E.", "Ph.D.", "WOSB", "MBE", "MBA", "PMP",
              "PE", "CPA", "CFLE", "PH", "MBS", "MPH", "CFP", "CRC", "CPC", "CPMA", "MD",
              "WBE", "DBE", ",", "RDN", "CDN", "M.P.S.", "PSA", "CRS", "GRI", "AHWD", "GMS",
              "AIA", "LEED", "AP", "MPA", "WBE", "DPT", "NCARB", "CCIM", "CPM", "CMMC", "SME",
              "M.Ed.", "CBI", "DDS", "CFM", "MSW", "LCSW", "MBBS", "MS", "MIT", "CDIA", "Ed", "MCT",
              "CMP", "BC", "SCP", "CGMA", "CISM", "CASP"]
    for title in titles:
        cleaned_name = cleaned_name.replace(title, '')

    # Process the name with spaCy
    doc = nlp(cleaned_name)

    # Remove pronouns based on token's POS tag
    non_pronoun_words = [token.text for token in doc if token.pos_ != 'PRON']

    # strip() to remove any leading or trailing spaces
    cleaned_name = ' '.join(non_pronoun_words).strip()

    # Split the cleaned name into first and last name
    parts = cleaned_name.split()
    first_name = parts[0] if parts else ''  # Check if parts is not empty
    last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''

    return first_name, last_name


def standardize_phone(phone):
    """function to standardize phone numbers to (XXX) XXX-XXXX"""
    # Remove all non-numeric characters
    digits = re.sub(r'\D', '', phone)

    # Remove +1 at the beginning if the number is more than 10 digits long
    if len(digits) > 10 and digits.startswith('1'):
        digits = digits[1:]

    # Return in the format (XXX) XXX-XXXX
    return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"

def extract_region(address):
    """function to extract the region from an address"""
    match = re.search(r'Primary State/Region of Business Operation(.+)', address)
    return match.group(1).strip() if match else ''

def extract_graduating_site(address):
    match = re.search(r'Graduating Site(.*?)Graduating Cohort', address)
    return match.group(1).strip() if match else ''

cleaned_data = []
for record in data:
    first_name, last_name = split_name(record.get('name', ''))
    phone = standardize_phone(record.get('phone', ''))
    address = extract_region(record.get('address', ''))
    graduating_site = extract_graduating_site(record.get('address', ''))
    
    email = record.get('email', '')
    website = record.get('website', '')
    businessName = record.get('businessName', '')
    jobTitle = record.get('jobTitle', '')
    industry = record.get('industry', '')
    personPageUrl = record.get('personPageUrl', '')

    cleaned_data.append({
        'First Name': first_name,
        'Last Name': last_name,
        'Phone': phone,
        'Address': address,
        'Graduating site': graduating_site,
        'Email': email,
        'Website': website,
        'Business Name': businessName,
        'Job Title': jobTitle,
        'Industry': industry,
        'Person PageURL': personPageUrl
    })


df = pd.DataFrame(cleaned_data)
df.to_excel('cleaned_contact_data.xlsx', index=False)
