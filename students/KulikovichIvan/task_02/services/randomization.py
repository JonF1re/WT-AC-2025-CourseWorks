import random
from typing import List, Dict, Any

class RandomizationService:
    @staticmethod
    def randomize_questions(questions: List, count: int = None) -> List:
        """Рандомизация порядка вопросов"""
        if not questions:
            return []
        
        randomized = questions.copy()
        random.shuffle(randomized)
        
        if count and count < len(randomized):
            return randomized[:count]
        return randomized
    
    @staticmethod
    def randomize_options(options: List) -> List:
        """Рандомизация порядка вариантов ответов"""
        if not options:
            return []
        
        randomized = options.copy()
        random.shuffle(randomized)
        return randomized
    
    @staticmethod
    def select_random_from_bank(questions: List, count: int) -> List:
        """Выбор случайных вопросов из банка"""
        if len(questions) <= count:
            return questions
        
        return random.sample(questions, count)