import json
import pandas as pd
import nltk
from nltk.corpus import wordnet
import re


with open('contact_data1_2.json', 'r', encoding="utf-8") as f:
    data = json.load(f)

nltk.download('wordnet')

def get_wordnet_pos(treebank_tag):
    """Map treebank POS tag to first character used by WordNet lemmatizer"""
    if treebank_tag.startswith('J'):
        return wordnet.ADJ
    elif treebank_tag.startswith('V'):
        return wordnet.VERB
    elif treebank_tag.startswith('N'):
        return wordnet.NOUN
    elif treebank_tag.startswith('R'):
        return wordnet.ADV
    elif treebank_tag.startswith('P'):
        return wordnet.PRON
    else:
        return wordnet.NOUN  # Default to noun

def split_name(name):
    # Remove backslashes and parentheses
    cleaned_name = re.sub(r'[\/()|]', '', name)
    
    # Tokenize the name
    tokens = nltk.word_tokenize(cleaned_name)
    
    # Get POS tags
    pos_tags = nltk.pos_tag(tokens)
    
    # Remove pronouns based on POS tags
    non_pronoun_words = [word for word, pos in pos_tags if get_wordnet_pos(pos) != wordnet.PRON]
    
    cleaned_name = ' '.join(non_pronoun_words)
    
    # Split the cleaned name into first and last name
    parts = cleaned_name.split()
    first_name = parts[0]
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


# Process the data
cleaned_data = []
for record in data:
    first_name, last_name = split_name(record['name'])
    phone = standardize_phone(record['phone'])
    
    
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


