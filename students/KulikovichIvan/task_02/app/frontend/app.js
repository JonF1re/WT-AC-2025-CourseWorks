const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const user = ref(null);
        const token = ref(localStorage.getItem('token'));
        const currentView = ref('quizzes');
        const notification = ref({ show: false, message: '', type: 'success' });
        
        const loginEmail = ref('admin@quiz.com');
        const loginPassword = ref('admin123');
        const registerEmail = ref('');
        const registerUsername = ref('');
        const registerFullName = ref('');
        const registerPassword = ref('');
        
        const quizzes = ref([]);
        const quizSearch = ref('');
        const quizFilter = ref('active');
        const userAttempts = ref([]);
        const userStats = ref({});
        
        const currentQuiz = ref(null);
        const currentQuestionIndex = ref(0);
        const selectedOption = ref(null);
        const timeLeft = ref(300);
        const timerInterval = ref(null);
        const quizResult = ref(null);
        const userAnswers = ref({});
        
        const newQuiz = ref({
            title: '',
            description: '',
            time_limit_minutes: 5,
            questions: [
                {
                    text: '',
                    explanation: '',
                    points: 1,
                    options: [
                        { text: '', is_correct: false },
                        { text: '', is_correct: true }
                    ]
                }
            ]
        });
        
        const quizFromBankData = ref({
            title: '',
            description: '',
            time_limit_minutes: 10,
            is_active: true
        });
        const selectedBankId = ref(null);
        
        const achievements = ref([
            {
                id: 1,
                name: "Новичок",
                description: "Пройдите свой первый квиз",
                type: "quiz_completed",
                icon: "fas fa-medal",
                is_active: true
            },
            {
                id: 2,
                name: "Перфекционист",
                description: "Получите 100% в квизе",
                type: "perfect_score",
                icon: "fas fa-star",
                is_active: true
            },
            {
                id: 3,
                name: "Скоростник",
                description: "Пройдите квиз быстрее отведённого времени",
                type: "fast_completion",
                icon: "fas fa-bolt",
                is_active: true
            },
            {
                id: 4,
                name: "Мастер Python",
                description: "Пройдите 5 квизов по Python",
                type: "master",
                icon: "fas fa-python",
                is_active: true
            },
            {
                id: 5,
                name: "Коллекционер",
                description: "Получите 10 достижений",
                type: "collector",
                icon: "fas fa-trophy",
                is_active: true
            }
        ]);

        const userAchievements = ref([]);
        const certificates = ref([]);
        const leaderboard = ref([
            {
                user_id: 1,
                username: "admin",
                total_points: 150,
                completed_quizzes: 5,
                achievements_count: 3,
                rank: 1
            },
            {
                user_id: 2,
                username: "user123",
                total_points: 120,
                completed_quizzes: 4,
                achievements_count: 2,
                rank: 2
            },
            {
                user_id: 3,
                username: "quizmaster",
                total_points: 95,
                completed_quizzes: 3,
                achievements_count: 1,
                rank: 3
            }
        ]);

        const questionBanks = ref([
            {
                id: 1,
                name: "Основы программирования",
                description: "Базовые вопросы по программированию",
                category: "Программирование",
                tags: "python, основы, алгоритмы",
                is_public: true,
                randomize_questions: true,
                randomize_options: false,
                questions_per_quiz: 10,
                created_at: new Date().toISOString(),
                question_count: 25
            },
            {
                id: 2,
                name: "Веб-разработка",
                description: "Вопросы по HTML, CSS, JavaScript",
                category: "Веб-разработка",
                tags: "html, css, javascript, веб",
                is_public: false,
                randomize_questions: true,
                randomize_options: true,
                questions_per_quiz: 15,
                created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                question_count: 30
            },
            {
                id: 3,
                name: "Базы данных",
                description: "Вопросы по SQL и базам данных",
                category: "Базы данных",
                tags: "sql, database, mysql, postgresql",
                is_public: true,
                randomize_questions: true,
                randomize_options: true,
                questions_per_quiz: 12,
                created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                question_count: 40
            }
        ]);
        
        const newQuestionBank = ref({
            name: '',
            description: '',
            category: '',
            tags: '',
            is_public: false,
            randomize_questions: false,
            randomize_options: false,
            questions_per_quiz: 10
        });
        
        const exportFormat = ref('csv');
        const exportStartDate = ref('');
        const exportEndDate = ref('');
        
        const API_URL = 'http://localhost:8000';
        
        const showNotification = (message, type = 'success') => {
            notification.value = { show: true, message, type };
            setTimeout(() => {
                notification.value.show = false;
            }, 5000);
        };
        
        const hideNotification = () => {
            notification.value.show = false;
        };
        
        const formatTime = (seconds) => {
            if (!seconds) return '00:00';
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        
        const getPercentageColor = (percentage) => {
            if (percentage >= 80) return 'text-green-600';
            if (percentage >= 60) return 'text-yellow-600';
            return 'text-red-600';
        };
        
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        const makeRequest = async (endpoint, options = {}) => {
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
            
            if (token.value) {
                headers['Authorization'] = `Bearer ${token.value}`;
            }
            
            try {
                const response = await fetch(`${API_URL}${endpoint}`, {
                    ...options,
                    headers
                });
                
                if (!response.ok) {
                    const error = await response.json().catch(() => ({ detail: 'Ошибка сервера' }));
                    throw new Error(error.detail || `Ошибка ${response.status}`);
                }
                
                if (response.status === 204) {
                    return null;
                }
                
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
                showNotification(error.message, 'error');
                throw error;
            }
        };
        
        const quickLogin = (type) => {
            if (type === 'admin') {
                loginEmail.value = 'admin@quiz.com';
                loginPassword.value = 'admin123';
            } else {
                loginEmail.value = 'user@test.com';
                loginPassword.value = 'test123';
            }
        };
        
        const login = async () => {
            try {
                const data = await makeRequest('/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: loginEmail.value,
                        password: loginPassword.value
                    })
                });
                
                token.value = data.access_token;
                localStorage.setItem('token', token.value);
                user.value = data.user;
                
                showNotification('Успешный вход!');
                currentView.value = 'quizzes';
                await loadUserData();
                
            } catch (error) {
                showNotification('Ошибка входа', 'error');
            }
        };
        
        const register = async () => {
            try {
                const data = await makeRequest('/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: registerEmail.value,
                        username: registerUsername.value,
                        full_name: registerFullName.value,
                        password: registerPassword.value
                    })
                });
                
                showNotification('Регистрация успешна! Теперь войдите в систему.');
                
                registerEmail.value = '';
                registerUsername.value = '';
                registerFullName.value = '';
                registerPassword.value = '';
                
            } catch (error) {
                showNotification('Ошибка регистрации', 'error');
            }
        };
        
        const logout = () => {
            token.value = null;
            localStorage.removeItem('token');
            user.value = null;
            currentView.value = 'quizzes';
            showNotification('Вы вышли из системы');
        };
        
        const getProfile = async () => {
            try {
                const data = await makeRequest('/users/me');
                user.value = data;
            } catch (error) {
                console.error('Ошибка получения профиля:', error);
            }
        };
        
        const loadUserData = async () => {
            if (!user.value) return;
            
            try {
                const stats = await makeRequest('/users/me/stats');
                userStats.value = stats;
                
                const attempts = await makeRequest('/users/me/attempts');
                userAttempts.value = attempts;
                
                certificates.value = [];
                attempts.forEach(attempt => {
                    if (attempt.total_points / attempt.max_points >= 0.7) {
                        certificates.value.push({
                            id: certificates.value.length + 1,
                            certificate_id: 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                            quiz_title: getQuizTitle(attempt.quiz_id),
                            score_percentage: Math.round((attempt.total_points / attempt.max_points) * 100),
                            issued_at: attempt.finished_at || new Date().toISOString(),
                            download_url: '#'
                        });
                    }
                });
                
                if (attempts.length > 0 && userAchievements.value.length === 0) {
                    const newbieAchievement = achievements.value.find(a => a.type === 'quiz_completed');
                    if (newbieAchievement) {
                        userAchievements.value.push({
                            id: 1,
                            user_id: user.value.id,
                            achievement_id: newbieAchievement.id,
                            earned_at: new Date().toISOString(),
                            progress: 100,
                            achievement: newbieAchievement
                        });
                    }
                }
                
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
            }
        };
        
        const loadQuizzes = async () => {
            try {
                const data = await makeRequest('/quizzes');
                quizzes.value = data;
            } catch (error) {
                console.error('Ошибка загрузки квизов:', error);
                if (user.value) {
                    showNotification('Ошибка загрузки квизов', 'error');
                }
            }
        };
        
        const filteredQuizzes = computed(() => {
            let filtered = quizzes.value;
            
            if (quizFilter.value === 'active') {
                filtered = filtered.filter(q => q.is_active);
            } else if (quizFilter.value === 'my' && user.value) {
                filtered = filtered.filter(q => q.creator_id === user.value.id);
            }
            
            if (quizSearch.value) {
                const search = quizSearch.value.toLowerCase();
                filtered = filtered.filter(q => 
                    q.title.toLowerCase().includes(search) || 
                    (q.description && q.description.toLowerCase().includes(search))
                );
            }
            
            return filtered;
        });
        
        const setQuizFilter = (filter) => {
            quizFilter.value = filter;
        };
        
        const startQuiz = async (quiz) => {
            try {
                const data = await makeRequest('/attempts/start', {
                    method: 'POST',
                    body: JSON.stringify({ quiz_id: quiz.id })
                });
                
                const quizDetails = await makeRequest(`/quizzes/${quiz.id}`);
                currentQuiz.value = quizDetails;
                currentQuestionIndex.value = 0;
                selectedOption.value = null;
                userAnswers.value = {};
                timeLeft.value = quizDetails.time_limit_minutes * 60;
                
                if (timerInterval.value) {
                    clearInterval(timerInterval.value);
                }
                
                timerInterval.value = setInterval(() => {
                    timeLeft.value--;
                    
                    if (timeLeft.value <= 0) {
                        clearInterval(timerInterval.value);
                        submitQuiz();
                    }
                }, 1000);
                
                currentView.value = 'quizTaking';
                
            } catch (error) {
                showNotification('Ошибка начала квиза', 'error');
            }
        };
        
        const currentQuestion = computed(() => {
            if (!currentQuiz.value || !currentQuiz.value.questions) return null;
            return currentQuiz.value.questions[currentQuestionIndex.value];
        });
        
        const selectOption = (optionId) => {
            selectedOption.value = optionId;
            userAnswers.value[currentQuestion.value.id] = optionId;
        };
        
        const nextQuestion = () => {
            if (currentQuestionIndex.value < currentQuiz.value.questions.length - 1) {
                currentQuestionIndex.value++;
                selectedOption.value = userAnswers.value[currentQuestion.value?.id] || null;
            }
        };
        
        const prevQuestion = () => {
            if (currentQuestionIndex.value > 0) {
                currentQuestionIndex.value--;
                selectedOption.value = userAnswers.value[currentQuestion.value?.id] || null;
            }
        };
        
        const checkAndCreateAchievements = (quizResult) => {
            try {
                if (userAttempts.value.length === 1) {
                    const newbieAchievement = achievements.value.find(a => a.type === 'quiz_completed');
                    if (newbieAchievement && !userAchievements.value.find(ua => ua.achievement_id === newbieAchievement.id)) {
                        userAchievements.value.push({
                            id: userAchievements.value.length + 1,
                            user_id: user.value.id,
                            achievement_id: newbieAchievement.id,
                            earned_at: new Date().toISOString(),
                            progress: 100,
                            achievement: newbieAchievement
                        });
                        showNotification('🎉 Получено достижение: Новичок!', 'success');
                    }
                }
                
                const scorePercentage = (quizResult.total_points / quizResult.max_points) * 100;
                if (scorePercentage === 100) {
                    const perfectAchievement = achievements.value.find(a => a.type === 'perfect_score');
                    if (perfectAchievement && !userAchievements.value.find(ua => ua.achievement_id === perfectAchievement.id)) {
                        userAchievements.value.push({
                            id: userAchievements.value.length + 1,
                            user_id: user.value.id,
                            achievement_id: perfectAchievement.id,
                            earned_at: new Date().toISOString(),
                            progress: 100,
                            achievement: perfectAchievement
                        });
                        showNotification('🏆 Получено достижение: Перфекционист!', 'success');
                    }
                }
                
                const timeLimit = currentQuiz.value.time_limit_minutes * 60;
                if (quizResult.time_spent_seconds && quizResult.time_spent_seconds < timeLimit / 2) {
                    const speedAchievement = achievements.value.find(a => a.type === 'fast_completion');
                    if (speedAchievement && !userAchievements.value.find(ua => ua.achievement_id === speedAchievement.id)) {
                        userAchievements.value.push({
                            id: userAchievements.value.length + 1,
                            user_id: user.value.id,
                            achievement_id: speedAchievement.id,
                            earned_at: new Date().toISOString(),
                            progress: 100,
                            achievement: speedAchievement
                        });
                        showNotification('⚡ Получено достижение: Скоростник!', 'success');
                    }
                }
                
            } catch (error) {
                console.error('Error creating achievements:', error);
            }
        };
        
        const submitQuiz = async () => {
            try {
                if (timerInterval.value) {
                    clearInterval(timerInterval.value);
                    timerInterval.value = null;
                }
                
                const answers = Object.entries(userAnswers.value).map(([questionId, optionId]) => ({
                    question_id: parseInt(questionId),
                    option_id: optionId
                }));
                
                const attemptId = userAttempts.value[0]?.id || 1;
                
                const result = await makeRequest(`/attempts/${attemptId}/submit`, {
                    method: 'POST',
                    body: JSON.stringify({ answers })
                });
                
                quizResult.value = result;
                currentView.value = 'quizResult';
                
                await loadUserData();
                
                checkAndCreateAchievements(result);
                
                showNotification('🎊 Квиз завершен!');
                
            } catch (error) {
                showNotification('Ошибка отправки ответов', 'error');
            }
        };
        
        const getQuestionPoints = (questionId) => {
            if (!currentQuiz.value) return 0;
            const question = currentQuiz.value.questions.find(q => q.id === questionId);
            return question ? question.points : 0;
        };
        
        const getQuizTitle = (quizId) => {
            const quiz = quizzes.value.find(q => q.id === quizId);
            return quiz ? quiz.title : `Квиз #${quizId}`;
        };
        
        const viewAttemptResult = async (attemptId) => {
            try {
                const attempt = userAttempts.value.find(a => a.id === attemptId);
                if (!attempt) {
                    showNotification('Попытка не найдена', 'error');
                    return;
                }
                
                try {
                    const result = await makeRequest(`/attempts/${attemptId}`);
                    quizResult.value = result;
                } catch (apiError) {
                    console.log('API недоступен, использую локальные данные');
                    quizResult.value = attempt;
                    
                    if (!quizResult.value.answers) {
                        quizResult.value.answers = [
                            { id: 1, question_id: 1, option_id: 1, is_correct: true, points_earned: 2 },
                            { id: 2, question_id: 2, option_id: 2, is_correct: true, points_earned: 2 },
                            { id: 3, question_id: 3, option_id: 1, is_correct: false, points_earned: 0 }
                        ];
                    }
                }
                
                try {
                    const quizDetails = await makeRequest(`/quizzes/${attempt.quiz_id}`);
                    currentQuiz.value = quizDetails;
                } catch (error) {
                    currentQuiz.value = {
                        id: attempt.quiz_id,
                        title: getQuizTitle(attempt.quiz_id),
                        questions: [
                            { id: 1, text: 'Что выведет print(type(5))?', points: 2 },
                            { id: 2, text: 'Как создать пустой список в Python?', points: 2 },
                            { id: 3, text: 'Что делает оператор "**" в Python?', points: 3 }
                        ]
                    };
                }
                
                currentView.value = 'quizResult';
                
            } catch (error) {
                console.error('Error loading attempt result:', error);
                showNotification('Ошибка загрузки результата', 'error');
            }
        };
        
        const addQuestion = () => {
            newQuiz.value.questions.push({
                text: '',
                explanation: '',
                points: 1,
                options: [
                    { text: '', is_correct: false },
                    { text: '', is_correct: true }
                ]
            });
        };
 
        const removeQuestion = (index) => {
            if (newQuiz.value.questions.length > 1) {
                newQuiz.value.questions.splice(index, 1);
            }
        };
        
        const addOption = (questionIndex) => {
            newQuiz.value.questions[questionIndex].options.push({
                text: '',
                is_correct: false
            });
        };
        
        const removeOption = (questionIndex, optionIndex) => {
            if (newQuiz.value.questions[questionIndex].options.length > 2) {
                newQuiz.value.questions[questionIndex].options.splice(optionIndex, 1);
            }
        };
        
        const isQuizValid = computed(() => {
            if (!newQuiz.value.title.trim()) return false;
            if (newQuiz.value.time_limit_minutes < 1) return false;
            
            for (const question of newQuiz.value.questions) {
                if (!question.text.trim()) return false;
                if (question.points < 1) return false;
                
                const hasOptions = question.options.some(opt => opt.text.trim());
                if (!hasOptions) return false;
                
                const hasCorrectOption = question.options.some(opt => opt.is_correct);
                if (!hasCorrectOption) return false;
            }
            
            return true;
        });
        
        const createNewQuiz = async () => {
            try {
                const quizData = {
                    title: newQuiz.value.title,
                    description: newQuiz.value.description,
                    time_limit_minutes: newQuiz.value.time_limit_minutes,
                    questions: newQuiz.value.questions.map(q => ({
                        text: q.text,
                        explanation: q.explanation,
                        points: q.points,
                        options: q.options.filter(opt => opt.text.trim())
                    }))
                };
                
                await makeRequest('/admin/quizzes', {
                    method: 'POST',
                    body: JSON.stringify(quizData)
                });
                
                showNotification('Квиз успешно создан!');
                currentView.value = 'quizzes';
                await loadQuizzes();
                
                newQuiz.value = {
                    title: '',
                    description: '',
                    time_limit_minutes: 5,
                    questions: [
                        {
                            text: '',
                            explanation: '',
                            points: 1,
                            options: [
                                { text: '', is_correct: false },
                                { text: '', is_correct: true }
                            ]
                        }
                    ]
                };
                
            } catch (error) {
                showNotification('Ошибка создания квиза', 'error');
            }
        };
        
        const generateQuizFromBank = async (bankId) => {
            try {
                if (!user.value || user.value.role !== 'admin') {
                    showNotification('Только администраторы могут создавать квизы из банков', 'error');
                    return;
                }
                
                const bank = questionBanks.value.find(b => b.id === bankId);
                if (!bank) {
                    showNotification('Банк вопросов не найден', 'error');
                    return;
                }
                
                selectedBankId.value = bankId;
                quizFromBankData.value = {
                    title: bank.name + ' - Квиз',
                    description: `Автоматически сгенерированный квиз из банка "${bank.name}"`,
                    time_limit_minutes: 10,
                    is_active: true
                };
                
                showGenerateQuizDialog(bank);
                
            } catch (error) {
                console.error('Error in generateQuizFromBank:', error);
                showNotification('Ошибка при создании квиза из банка', 'error');
            }
        };
        
        const showGenerateQuizDialog = (bank) => {
            const modalHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-2xl font-bold text-gray-800">Создать квиз из банка</h3>
                            <button onclick="document.getElementById('quiz-bank-modal').remove()" 
                                    class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        
                        <div class="mb-6">
                            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-4">
                                <h4 class="font-bold text-gray-800 mb-2">${bank.name}</h4>
                                <p class="text-gray-600 text-sm mb-2">${bank.description || 'Без описания'}</p>
                                <div class="flex flex-wrap gap-2">
                                    <span class="tag tag-blue">${bank.category || 'Без категории'}</span>
                                    <span class="tag tag-green">${bank.question_count || 0} вопросов</span>
                                    <span class="tag tag-purple">${bank.questions_per_quiz} в квизе</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Название квиза</label>
                                <input type="text" id="quizTitle" 
                                       value="${bank.name + ' - Квиз'}"
                                       class="input-field w-full">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                                <textarea id="quizDescription" rows="3" class="input-field w-full">Автоматически сгенерированный квиз из банка "${bank.name}"</textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Время (минут)</label>
                                <input type="number" id="quizTime" value="10" min="1" max="60" class="input-field w-full">
                            </div>
                            
                            <div class="flex items-center space-x-3 mb-4">
                                <input type="checkbox" id="quizActive" checked class="h-4 w-4 text-indigo-600">
                                <label for="quizActive" class="text-sm text-gray-700">Активный квиз</label>
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-3 pt-6 border-t">
                            <button onclick="document.getElementById('quiz-bank-modal').remove()"
                                    class="btn-secondary">
                                Отмена
                            </button>
                            <button onclick="window.app.generateQuizFromBankConfirm(${bank.id})"
                                    class="btn-primary">
                                <i class="fas fa-magic mr-2"></i>Создать квиз
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const oldModal = document.getElementById('quiz-bank-modal');
            if (oldModal) oldModal.remove();
            
            const modalDiv = document.createElement('div');
            modalDiv.id = 'quiz-bank-modal';
            modalDiv.innerHTML = modalHTML;
            document.body.appendChild(modalDiv);
            
            const style = document.createElement('style');
            style.textContent = `
                #quiz-bank-modal {
                    position: fixed;
                    z-index: 1000;
                }
                #quiz-bank-modal .tag {
                    padding: 0.25rem 0.75rem;
                    font-size: 0.75rem;
                    border-radius: 9999px;
                }
                #quiz-bank-modal .tag-blue {
                    background-color: #dbeafe;
                    color: #1e40af;
                }
                #quiz-bank-modal .tag-green {
                    background-color: #d1fae5;
                    color: #065f46;
                }
                #quiz-bank-modal .tag-purple {
                    background-color: #f3e8ff;
                    color: #6b21a8;
                }
            `;
            document.head.appendChild(style);
        };
        
        window.app = {
            generateQuizFromBankConfirm: async function(bankId) {
                try {
                    const title = document.getElementById('quizTitle').value;
                    const description = document.getElementById('quizDescription').value;
                    const timeLimit = parseInt(document.getElementById('quizTime').value);
                    const isActive = document.getElementById('quizActive').checked;
                    
                    if (!title.trim()) {
                        showNotification('Введите название квиза', 'error');
                        return;
                    }
                    
                    const bank = questionBanks.value.find(b => b.id === bankId);
                    
                    const demoQuestions = generateDemoQuestionsFromBank(bank);
                    
                    const quizData = {
                        title: title,
                        description: description,
                        time_limit_minutes: timeLimit,
                        questions: demoQuestions
                    };
                    
                    await makeRequest('/admin/quizzes', {
                        method: 'POST',
                        body: JSON.stringify(quizData)
                    });
                    
                    const modal = document.getElementById('quiz-bank-modal');
                    if (modal) modal.remove();
                    
                    showNotification(`✅ Квиз успешно создан из банка "${bank.name}"!`, 'success');
                    
                    await loadQuizzes();
                    
                    currentView.value = 'quizzes';
                    
                } catch (error) {
                    console.error('Error creating quiz from bank:', error);
                    showNotification('❌ Ошибка при создании квиза', 'error');
                }
            }
        };
        
        const generateDemoQuestionsFromBank = (bank) => {
            const categories = {
                'Программирование': [
                    {
                        text: 'Что такое переменная в программировании?',
                        explanation: 'Переменная - это именованная область памяти для хранения данных.',
                        points: 2,
                        options: [
                            { text: 'Контейнер для хранения данных, который может изменяться', is_correct: true },
                            { text: 'Постоянное значение, которое нельзя изменить', is_correct: false },
                            { text: 'Функция для вывода данных', is_correct: false },
                            { text: 'Тип данных в Python', is_correct: false }
                        ]
                    },
                    {
                        text: 'Какой язык программирования является интерпретируемым?',
                        explanation: 'Python, JavaScript, PHP - интерпретируемые языки.',
                        points: 3,
                        options: [
                            { text: 'Python', is_correct: true },
                            { text: 'C++', is_correct: false },
                            { text: 'Java', is_correct: false },
                            { text: 'Все перечисленные', is_correct: false }
                        ]
                    }
                ],
                'Веб-разработка': [
                    {
                        text: 'Что означает аббревиатура HTML?',
                        explanation: 'HTML - HyperText Markup Language (язык гипертекстовой разметки).',
                        points: 2,
                        options: [
                            { text: 'HyperText Markup Language', is_correct: true },
                            { text: 'Hyper Transfer Markup Language', is_correct: false },
                            { text: 'High Tech Modern Language', is_correct: false },
                            { text: 'Hyper Tool Markup Language', is_correct: false }
                        ]
                    },
                    {
                        text: 'Какой тег используется для создания ссылки в HTML?',
                        explanation: 'Тег <a> используется для создания гиперссылок.',
                        points: 2,
                        options: [
                            { text: '<a>', is_correct: true },
                            { text: '<link>', is_correct: false },
                            { text: '<href>', is_correct: false },
                            { text: '<url>', is_correct: false }
                        ]
                    }
                ],
                'Базы данных': [
                    {
                        text: 'Что такое SQL?',
                        explanation: 'SQL - Structured Query Language (язык структурированных запросов).',
                        points: 2,
                        options: [
                            { text: 'Язык для работы с базами данных', is_correct: true },
                            { text: 'Система управления базами данных', is_correct: false },
                            { text: 'Тип базы данных', is_correct: false },
                            { text: 'Язык программирования', is_correct: false }
                        ]
                    },
                    {
                        text: 'Какой оператор SQL используется для выборки данных?',
                        explanation: 'SELECT используется для выборки данных из таблиц.',
                        points: 2,
                        options: [
                            { text: 'SELECT', is_correct: true },
                            { text: 'GET', is_correct: false },
                            { text: 'FIND', is_correct: false },
                            { text: 'QUERY', is_correct: false }
                        ]
                    }
                ]
            };
            
            const categoryQuestions = categories[bank.category] || categories['Программирование'];
            
            const questionsCount = Math.min(bank.questions_per_quiz, categoryQuestions.length);
            const selectedQuestions = [];
            
            for (let i = 0; i < questionsCount; i++) {
                const question = { ...categoryQuestions[i] };
                if (bank.randomize_options) {
                    question.options = [...question.options].sort(() => Math.random() - 0.5);
                }
                selectedQuestions.push(question);
            }
            
            if (bank.randomize_questions) {
                return selectedQuestions.sort(() => Math.random() - 0.5);
            }
            
            return selectedQuestions;
        };
        
        const exportResults = async () => {
            try {
                const exportData = userAttempts.value.map(attempt => ({
                    attempt_id: attempt.id,
                    quiz_title: getQuizTitle(attempt.quiz_id),
                    user: user.value.username,
                    started_at: formatDate(attempt.started_at),
                    finished_at: formatDate(attempt.finished_at),
                    time_spent: formatTime(attempt.time_spent_seconds),
                    total_points: attempt.total_points,
                    max_points: attempt.max_points,
                    score_percentage: Math.round((attempt.total_points / attempt.max_points) * 100),
                    is_completed: attempt.is_completed
                }));
                
                let content, filename, mimeType;
                
                if (exportFormat.value === 'csv') {
                    const headers = Object.keys(exportData[0] || {}).join(',');
                    const rows = exportData.map(item => 
                        Object.values(item).map(val => 
                            typeof val === 'string' ? `"${val}"` : val
                        ).join(',')
                    );
                    content = [headers, ...rows].join('\n');
                    filename = `quiz_results_${new Date().toISOString().slice(0,10)}.csv`;
                    mimeType = 'text/csv';
                } else {
                    content = JSON.stringify(exportData, null, 2);
                    filename = `quiz_results_${new Date().toISOString().slice(0,10)}.json`;
                    mimeType = 'application/json';
                }
                
                const blob = new Blob([content], { type: mimeType });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                showNotification('✅ Экспорт завершен успешно! Файл скачан.', 'success');
                
            } catch (error) {
                showNotification('❌ Ошибка экспорта', 'error');
                console.error('Export error:', error);
            }
        };

  const exportSingleResult = async (attemptId) => {
            try {
                console.log('Starting export for attempt ID:', attemptId);
                
                let attempt;
                
                if (attemptId && userAttempts.value) {
                    attempt = userAttempts.value.find(a => a.id === attemptId);
                }
                
                if (!attempt && quizResult.value) {
                    attempt = quizResult.value;
                }
                
                if (!attempt) {
                    showNotification('Попытка не найдена', 'error');
                    return;
                }
                
                console.log('Found attempt:', attempt);
                
                const exportData = {
                    quiz_attempt_id: attempt.id,
                    quiz_id: attempt.quiz_id,
                    quiz_title: getQuizTitle(attempt.quiz_id),
                    user: user.value?.username || 'Unknown',
                    user_id: user.value?.id,
                    started_at: attempt.started_at,
                    finished_at: attempt.finished_at,
                    time_spent_seconds: attempt.time_spent_seconds || 0,
                    total_points: attempt.total_points || 0,
                    max_points: attempt.max_points || 0,
                    score_percentage: attempt.max_points ? 
                        Math.round((attempt.total_points / attempt.max_points) * 100) : 0,
                    is_completed: attempt.is_completed || false,
                    exported_at: new Date().toISOString(),
                    export_format: 'JSON'
                };
                
                console.log('Export data:', exportData);
                
                const content = JSON.stringify(exportData, null, 2);
                const filename = `quiz_result_${attempt.id}_${new Date().toISOString().slice(0,10)}.json`;
                
                const blob = new Blob([content], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                showNotification('✅ Результат экспортирован!', 'success');
                
            } catch (error) {
                console.error('Export error details:', error);
                showNotification('❌ Ошибка экспорта: ' + error.message, 'error');
            }
        };
        
        const createQuestionBank = async () => {
            try {
                const newBank = {
                    id: questionBanks.value.length + 1,
                    ...newQuestionBank.value,
                    created_at: new Date().toISOString(),
                    question_count: Math.floor(Math.random() * 20) + 10
                };
                
                questionBanks.value.unshift(newBank);
                
                showNotification('✅ Банк вопросов создан успешно!', 'success');
                currentView.value = 'questionBanks';
                
                newQuestionBank.value = {
                    name: '',
                    description: '',
                    category: '',
                    tags: '',
                    is_public: false,
                    randomize_questions: false,
                    randomize_options: false,
                    questions_per_quiz: 10
                };
                
            } catch (error) {
                showNotification('❌ Ошибка создания банка вопросов', 'error');
            }
        };
        
        const generateCertificate = async (attemptId) => {
            try {
                const attempt = userAttempts.value.find(a => a.id === attemptId);
                if (!attempt) {
                    showNotification('Попытка не найдена', 'error');
                    return;
                }
                
                const existingCertificate = certificates.value.find(c => 
                    c.quiz_title === getQuizTitle(attempt.quiz_id) && 
                    c.score_percentage === Math.round((attempt.total_points / attempt.max_points) * 100)
                );
                
                if (existingCertificate) {
                    showNotification('Сертификат уже существует!', 'info');
                    return;
                }
                
                const newCertificate = {
                    id: certificates.value.length + 1,
                    certificate_id: 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    quiz_title: getQuizTitle(attempt.quiz_id),
                    score_percentage: Math.round((attempt.total_points / attempt.max_points) * 100),
                    issued_at: new Date().toISOString(),
                    download_url: '#'
                };
                
                certificates.value.unshift(newCertificate);
                
                showNotification('🎓 Сертификат успешно создан!', 'success');
                
            } catch (error) {
                showNotification('❌ Ошибка создания сертификата', 'error');
                console.error('Certificate generation error:', error);
            }
        };
        
        const downloadCertificate = (certificate) => {
            try {
                const certificateHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>Сертификат - ${certificate.quiz_title}</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { 
                                font-family: 'Arial', sans-serif; 
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                min-height: 100vh;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                padding: 20px;
                            }
                            .certificate-container {
                                background: white;
                                border-radius: 20px;
                                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                                padding: 50px;
                                max-width: 800px;
                                width: 100%;
                                text-align: center;
                                position: relative;
                                overflow: hidden;
                            }
                            .certificate-container::before {
                                content: '';
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" opacity="0.05"><path d="M0,0 L100,0 L100,100 Z" fill="%234f46e5"/></svg>');
                                background-size: cover;
                                pointer-events: none;
                            }
                            .header {
                                margin-bottom: 40px;
                            }
                            .logo {
                                font-size: 36px;
                                font-weight: bold;
                                color: #4f46e5;
                                margin-bottom: 10px;
                            }
                            .subtitle {
                                color: #6b7280;
                                font-size: 18px;
                                margin-bottom: 30px;
                            }
                            .title {
                                font-size: 42px;
                                color: #1f2937;
                                margin-bottom: 40px;
                                font-weight: 300;
                            }
                            .user-name {
                                font-size: 32px;
                                color: #4f46e5;
                                margin: 30px 0;
                                font-weight: bold;
                            }
                            .course-title {
                                font-size: 28px;
                                color: #374151;
                                margin-bottom: 30px;
                                font-weight: 500;
                            }
                            .score {
                                font-size: 72px;
                                color: #059669;
                                margin: 40px 0;
                                font-weight: bold;
                            }
                            .date {
                                font-size: 18px;
                                color: #6b7280;
                                margin: 30px 0;
                            }
                            .certificate-id {
                                font-size: 14px;
                                color: #9ca3af;
                                margin-top: 40px;
                            }
                            .footer {
                                margin-top: 50px;
                                padding-top: 30px;
                                border-top: 2px solid #e5e7eb;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            }
                            .signature {
                                text-align: left;
                            }
                            .signature-name {
                                font-weight: bold;
                                color: #1f2937;
                            }
                            .signature-title {
                                color: #6b7280;
                                font-size: 14px;
                            }
                            .qr-code {
                                width: 100px;
                                height: 100px;
                                background: #f3f4f6;
                                border-radius: 10px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 12px;
                                color: #9ca3af;
                            }
                            .watermark {
                                position: absolute;
                                bottom: 20px;
                                right: 20px;
                                opacity: 0.1;
                                font-size: 48px;
                                color: #4f46e5;
                                transform: rotate(-15deg);
                            }
                        </style>
                    </head>
                    <body>
                        <div class="certificate-container">
                            <div class="watermark">QuizPlatform</div>
                            <div class="header">
                                <div class="logo">QuizPlatform</div>
                                <div class="subtitle">Система онлайн-тестирования</div>
                            </div>
                            <div class="title">СЕРТИФИКАТ</div>
                            <div>Настоящим удостоверяется, что</div>
                            <div class="user-name">${user.value?.full_name || user.value?.username || 'Пользователь'}</div>
                            <div>успешно завершил(а) тестирование</div>
                            <div class="course-title">«${certificate.quiz_title}»</div>
                            <div>с результатом</div>
                            <div class="score">${certificate.score_percentage}%</div>
                            <div class="date">Дата выдачи: ${formatDate(certificate.issued_at)}</div>
                            <div class="certificate-id">ID сертификата: ${certificate.certificate_id}</div>
                            <div class="footer">
                                <div class="signature">
                                    <div class="signature-name">QuizPlatform Admin</div>
                                    <div class="signature-title">Главный администратор</div>
                                </div>
                                <div class="qr-code">
                                    QR-код<br>сертификата
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                
                const blob = new Blob([certificateHTML], { type: 'text/html' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Сертификат_${certificate.quiz_title.replace(/[^a-z0-9]/gi, '_')}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                showNotification('📄 Сертификат скачан!', 'success');
                
            } catch (error) {
                showNotification('❌ Ошибка скачивания сертификата', 'error');
            }
        };
        
        const shareCertificate = (certificate) => {
            const shareText = `🎓 Я получил сертификат по "${certificate.quiz_title}" с результатом ${certificate.score_percentage}% на QuizPlatform!`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'Мой сертификат QuizPlatform',
                    text: shareText,
                    url: window.location.href
                }).then(() => {
                    showNotification('✅ Поделились успешно!', 'success');
                }).catch((error) => {
                    console.log('Sharing cancelled', error);
                });
            } else {
                navigator.clipboard.writeText(shareText).then(() => {
                    showNotification('📋 Текст для публикации скопирован в буфер обмена!', 'success');
                }).catch(() => {
                    const textArea = document.createElement('textarea');
                    textArea.value = shareText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showNotification('📋 Текст скопирован в буфер обмена!', 'success');
                });
            }
        };
        
        const updateLeaderboard = () => {
            const demoUsers = [
                { user_id: 999, username: "demo_user1", total_points: 180, completed_quizzes: 7, achievements_count: 4 },
                { user_id: 998, username: "demo_user2", total_points: 165, completed_quizzes: 6, achievements_count: 3 },
                { user_id: 997, username: "demo_user3", total_points: 140, completed_quizzes: 5, achievements_count: 3 }
            ];
            
            if (user.value) {
                demoUsers.push({
                    user_id: user.value.id,
                    username: user.value.username,
                    total_points: userStats.value.total_points || 0,
                    completed_quizzes: userStats.value.total_quizzes || 0,
                    achievements_count: userAchievements.value.length
                });
            }
            
            demoUsers.sort((a, b) => b.total_points - a.total_points);
            
            leaderboard.value = demoUsers.map((user, index) => ({
                ...user,
                rank: index + 1
            }));
        };
        
        onMounted(async () => {
            if (token.value) {
                await getProfile();
                await loadQuizzes();
                await loadUserData();
                updateLeaderboard();
            }
            
            if (!user.value) {
                await loadQuizzes();
            }
        });
        
        const watchUser = () => {
            if (user.value) {
                loadQuizzes();
                loadUserData();
                updateLeaderboard();
            }
        };
        
        return {
            user,
            currentView,
            notification,
            loginEmail,
            loginPassword,
            registerEmail,
            registerUsername,
            registerFullName,
            registerPassword,
            quizzes,
            quizSearch,
            quizFilter,
            filteredQuizzes,
            userAttempts,
            userStats,
            currentQuiz,
            currentQuestionIndex,
            currentQuestion,
            selectedOption,
            timeLeft,
            quizResult,
            newQuiz,
            isQuizValid,
            
            achievements,
            userAchievements,
            questionBanks,
            certificates,
            leaderboard,
            newQuestionBank,
            exportFormat,
            exportStartDate,
            exportEndDate,
            
            
            quickLogin,
            login,
            register,
            logout,
            getProfile,
            showNotification,
            hideNotification,
            formatTime,
            formatDate,
            getPercentageColor,
            setQuizFilter,
            startQuiz,
            selectOption,
            nextQuestion,
            prevQuestion,
            submitQuiz,
            getQuestionPoints,
            getQuizTitle,
            viewAttemptResult,
            addQuestion,
            removeQuestion,
            addOption,
            removeOption,
            createNewQuiz,
            
            exportResults,
            createQuestionBank,
            generateCertificate,
            downloadCertificate,
            shareCertificate,
            updateLeaderboard,
            
            generateQuizFromBank,
            exportSingleResult
        };
    }
}).mount('#app');