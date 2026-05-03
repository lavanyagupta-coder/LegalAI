import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib

# Step 1: Sample training data
data = [
    ("This agreement is fair for both parties.", "Low"),
    ("The company holds all rights and may terminate anytime.", "High"),
    ("Payment shall be made within 30 days.", "Low"),
    ("Failure to comply may result in penalty.", "Medium"),
    ("The user waives all claims against the provider.", "High"),
]

# Step 2: Train model
df = pd.DataFrame(data, columns=["text", "risk"])
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(df["text"])
model = LogisticRegression()
model.fit(X, df["risk"])

# Step 3: Save model and vectorizer
joblib.dump(model, "risk_model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("✅ Model trained and saved successfully!")
