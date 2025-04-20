from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import re
from typing import Optional
import nltk
from nltk.tokenize import sent_tokenize
from nltk.corpus import stopwords

# NLTKリソースのダウンロード
nltk.download('punkt')
nltk.download('stopwords')

app = FastAPI()

class SummaryRequest(BaseModel):
    content: str
    url: Optional[str] = None
    max_length: Optional[int] = 300

class SummaryResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int

@app.post("/summarize", response_model=SummaryResponse)
async def summarize(request: SummaryRequest):
    try:
        # 入力テキストの正規化
        content = request.content.strip()
        if not content:
            raise HTTPException(status_code=400, detail="Content is empty")
        
        # 文章に分割
        sentences = sent_tokenize(content)
        if len(sentences) <= 3:
            # 文章が少ない場合はそのまま返す
            return SummaryResponse(
                summary=content,
                original_length=len(content),
                summary_length=len(content)
            )
        
        # 単語頻度の計算
        stop_words = set(stopwords.words('english'))
        word_frequencies = {}
        
        for sentence in sentences:
            # 単語に分割（簡易的）
            words = re.findall(r'\w+', sentence.lower())
            for word in words:
                if word not in stop_words:
                    if word not in word_frequencies:
                        word_frequencies[word] = 1
                    else:
                        word_frequencies[word] += 1
        
        # 単語の重み付け
        max_frequency = max(word_frequencies.values()) if word_frequencies else 1
        for word in word_frequencies:
            word_frequencies[word] = word_frequencies[word] / max_frequency
        
        # 文章のスコア計算
        sentence_scores = {}
        for i, sentence in enumerate(sentences):
            words = re.findall(r'\w+', sentence.lower())
            score = 0
            for word in words:
                if word in word_frequencies:
                    score += word_frequencies[word]
            sentence_scores[i] = score / len(words) if words else 0
        
        # 上位の文章を選択
        summary_length = min(len(sentences) // 3 + 1, 5)  # 文章の1/3か最大5文まで
        summary_indices = sorted(sentence_scores, key=sentence_scores.get, reverse=True)[:summary_length]
        summary_indices.sort()  # 元の順序を維持
        
        # 要約の作成
        summary = ' '.join([sentences[i] for i in summary_indices])
        
        # 最大長さに制限
        if request.max_length and len(summary) > request.max_length:
            summary = summary[:request.max_length] + "..."
        
        return SummaryResponse(
            summary=summary,
            original_length=len(content),
            summary_length=len(summary)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)