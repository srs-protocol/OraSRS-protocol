# CIC-IDS2017 Label Generation Logic

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

def generate_cic_ids2017_labels(input_file, output_file):
    """
    Generate labeled dataset from CIC-IDS2017 raw data
    """
    
    # Load the raw CIC-IDS2017 data
    df = pd.read_csv(input_file)
    
    # Define attack categories in CIC-IDS2017
    attack_categories = {
        'BENIGN': 'normal',
        'Bot': 'malware',
        'DDoS': 'ddos',
        'DoS Hulk': 'ddos',
        'DoS GoldenEye': 'ddos',
        'DoS slowloris': 'ddos',
        'DoS Slowhttptest': 'ddos',
        'FTP-Patator': 'bruteforce',
        'SSH-Patator': 'bruteforce',
        'Heartbleed': 'vulnerability',
        'Infiltration': 'infiltration',
        'PortScan': 'scanning',
        'Web Attack – Brute Force': 'bruteforce',
        'Web Attack – XSS': 'xss',
        'Web Attack – Sql Injection': 'sqli'
    }
    
    # Create binary labels (0: normal, 1: attack)
    df['label_binary'] = df['Label'].apply(lambda x: 0 if x == 'BENIGN' else 1)
    
    # Create multi-class labels
    df['label_multiclass'] = df['Label'].map(attack_categories).fillna('unknown')
    
    # Additional feature engineering for threat scoring
    df['threat_score'] = df.apply(calculate_threat_score, axis=1)
    
    # Save labeled dataset
    df.to_csv(output_file, index=False)
    print(f"Labeled dataset saved to {output_file}")

def calculate_threat_score(row):
    """
    Calculate threat score based on network flow features
    """
    score = 0.0
    if row['Protocol'] == 6:  # TCP
        score += 0.1
    if row['Fwd_Packet_Length_Max'] > 1500:
        score += 0.2  # Potential oversized packets
    if row['Average_Packet_Size'] > 1000:
        score += 0.15  # Large average packet size
    if row['Subflow_Fwd_Packets'] > 1000:
        score += 0.25  # High packet count
    if row['Fwd_Seg_Size_Min'] == 1:
        score += 0.1  # Small segments may indicate fragmentation attacks
    
    # Cap score between 0 and 1
    return min(1.0, max(0.0, score))

def split_for_training(df, test_ratio=0.2):
    """
    Split dataset for training and testing
    """
    from sklearn.model_selection import train_test_split
    
    # Separate features and labels
    X = df.drop(['Label', 'label_binary', 'label_multiclass'], axis=1)
    y_binary = df['label_binary']
    y_multiclass = df['label_multiclass']
    
    # Split the data
    X_train, X_test, y_train_binary, y_test_binary = train_test_split(
        X, y_binary, test_size=test_ratio, random_state=42, stratify=y_binary
    )
    _, _, y_train_multi, y_test_multi = train_test_split(
        X, y_multiclass, test_size=test_ratio, random_state=42, stratify=y_multiclass
    )
    
    return {
        'X_train': X_train,
        'X_test': X_test,
        'y_train_binary': y_train_binary,
        'y_test_binary': y_test_binary,
        'y_train_multiclass': y_train_multi,
        'y_test_multiclass': y_test_multi
    }

if __name__ == "__main__":
    # Example usage
    generate_cic_ids2017_labels('input.csv', 'labeled_output.csv')
