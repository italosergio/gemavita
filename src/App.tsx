import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import gemaVitaLogo from './assets/gema-vita-logo.webp'
import './App.css'

type Flavor = 'carne_com_queijo' | 'frango_com_queijo' | 'carne' | 'frango'
type QRStatus = 'created' | 'distributed' | 'scanned' | 'quiz_started' | 'quiz_completed' | 'rewarded' | 'redeemed' | 'expired'
type RewardType = 'none' | 'free_omelete' | 'voucher_50'
type RewardStatus = 'available' | 'redeemed' | 'expired' | 'cancelled'

type QRCode = {
  id: string
  productNumber: string
  batchId: string
  flavor: Flavor
  shift: 'manha' | 'tarde'
  status: QRStatus
  url: string
  createdAt: string
  distributedAt?: string
  scannedAt?: string
  quizStartedAt?: string
  quizCompletedAt?: string
  used: boolean
}

type Batch = {
  id: string
  code: string
  week: string
  startDate: string
  endDate: string
  totalProduced: number
  status: 'planned' | 'active' | 'closed' | 'cancelled'
  createdAt: string
}

type BatchOutput = {
  id: string
  batchId: string
  flavor: Flavor
  quantity: number
  region: string
  seller: string
  deliveryType: 'vendedor' | 'delivery' | 'ponto_fixo' | 'outro'
  shift: 'manha' | 'tarde'
  createdAt: string
}

type Customer = {
  id: string
  name: string
  whatsapp: string
  region: string
  points: number
  level: 'bronze' | 'silver' | 'gold'
  totalQuizzes: number
  totalRewards: number
  totalPurchasesTracked: number
  lastInteractionAt: string
}

type QuizResponse = {
  id: string
  qrCodeId: string
  batchId: string
  productNumber: string
  userId: string
  customerName: string
  whatsapp: string
  region: string
  experience: { flavor: Flavor; rating: string; likedMost: string }
  preference: { question: string; answer: string }
  pointsEarned: number
  rewardId?: string
  createdAt: string
}

type Reward = {
  id: string
  code: string
  userId: string
  customerName: string
  whatsapp: string
  qrCodeId: string
  batchId: string
  type: RewardType
  status: RewardStatus
  expiresAt?: string
  redeemedAt?: string
  createdAt: string
}

type Store = {
  qrs: QRCode[]
  batches: Batch[]
  outputs: BatchOutput[]
  customers: Customer[]
  responses: QuizResponse[]
  rewards: Reward[]
}

const FLAVORS: { value: Flavor; label: string; price: number; desc: string }[] = [
  { value: 'carne_com_queijo', label: 'Carne com queijo', price: 15, desc: 'Omelete completo, cremoso e bem reforçado.' },
  { value: 'frango_com_queijo', label: 'Frango com queijo', price: 15, desc: 'Frango temperado, queijo derretido e suco incluso.' },
  { value: 'carne', label: 'Carne', price: 10, desc: 'Sabor clássico, quente e prático para a rotina.' },
  { value: 'frango', label: 'Frango', price: 10, desc: 'Leve, proteico e pronto para acompanhar seu dia.' },
]

const REGIONS = ['Centro', 'Boa Vista', 'Derby', 'Madalena', 'Casa Forte', 'Outro']
const PREFERENCE_QUESTIONS = [
  'Você compraria uma versão sem farinha?',
  'Você compraria uma versão com tapioca?',
  'Você compraria uma versão com aveia?',
  'Você compraria uma versão sem queijo?',
  'Você pagaria a mais por suco natural?',
  'Você compraria uma versão fitness?',
  'Você compraria um combo semanal?',
  'Você indicaria a Gema Vita para alguém?',
]
const MOTIVATIONAL_MESSAGES = [
  'Você ajudou a Gema Vita a melhorar e aumentou suas chances de receber ofertas especiais.',
  'Cada resposta ajuda a gente a preparar uma experiência melhor pra você.',
  'Continue acompanhando. Novas vantagens podem aparecer nos próximos produtos.',
  'Sua opinião tem valor e ajuda a Gema Vita a crescer com mais sabor e cuidado.',
]
const WHATSAPP = '5581999999999'
const STORE_KEY = 'gema-vita-mvp-store'

function now() {
  return new Date().toISOString()
}

function flavorLabel(value: string) {
  return FLAVORS.find((flavor) => flavor.value === value)?.label ?? value
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function hashText(text: string) {
  return text.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
}

function weekCode(date = new Date()) {
  const firstJan = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - firstJan.getTime()) / 86400000)
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function defaultStore(): Store {
  const batchCode = `GV-${weekCode()}-001`
  const baseDate = now()
  const qrs = Array.from({ length: 8 }, (_, index) => {
    const productNumber = String(index + 1).padStart(4, '0')
    const flavor = FLAVORS[index % FLAVORS.length].value
    const id = `${batchCode}-${productNumber}`
    return {
      id,
      productNumber,
      batchId: batchCode,
      flavor,
      shift: index % 2 === 0 ? 'manha' : 'tarde',
      status: index < 3 ? 'distributed' : 'created',
      url: `/vantagens?product=${productNumber}&batch=${batchCode}&flavor=${flavor}`,
      createdAt: baseDate,
      distributedAt: index < 3 ? baseDate : undefined,
      used: false,
    } satisfies QRCode
  })

  return {
    batches: [
      {
        id: batchCode,
        code: batchCode,
        week: weekCode(),
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
        totalProduced: 80,
        status: 'active',
        createdAt: baseDate,
      },
    ],
    qrs,
    outputs: [
      {
        id: createId('output'),
        batchId: batchCode,
        flavor: 'frango_com_queijo',
        quantity: 30,
        region: 'Centro',
        seller: 'Italo',
        deliveryType: 'vendedor',
        shift: 'manha',
        createdAt: baseDate,
      },
    ],
    customers: [],
    responses: [],
    rewards: [],
  }
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? { ...defaultStore(), ...JSON.parse(raw) } : defaultStore()
  } catch {
    return defaultStore()
  }
}

function saveStore(store: Store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

function useStore() {
  const [store, setStore] = useState<Store>(() => loadStore())
  function update(recipe: (draft: Store) => void) {
    setStore((current) => {
      const next = structuredClone(current) as Store
      recipe(next)
      saveStore(next)
      return next
    })
  }
  function reset() {
    const fresh = defaultStore()
    saveStore(fresh)
    setStore(fresh)
  }
  return { store, update, reset }
}

function useRoute() {
  const [locationKey, setLocationKey] = useState(() => window.location.pathname + window.location.search)
  useEffect(() => {
    const onPop = () => setLocationKey(window.location.pathname + window.location.search)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  function go(path: string) {
    window.history.pushState({}, '', path)
    setLocationKey(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return { path: window.location.pathname, params: new URLSearchParams(window.location.search), locationKey, go }
}

function App() {
  const data = useStore()
  const route = useRoute()
  const [lastResult, setLastResult] = useState<{ reward: Reward | null; points: number; message: string } | null>(null)

  const pageProps = { ...data, go: route.go, setLastResult }
  const path = route.path

  let page = <HomePage {...pageProps} />
  if (path === '/cardapio') page = <MenuPage go={route.go} />
  if (path === '/contato') page = <ContactPage go={route.go} />
  if (path === '/vantagens') page = <AdvantagesPage {...pageProps} params={route.params} />
  if (path === '/quiz') page = <QuizPage {...pageProps} params={route.params} />
  if (path === '/quiz/resultado') page = <QuizResultPage go={route.go} result={lastResult} />
  if (path.startsWith('/cliente')) page = <ClientPage store={data.store} go={route.go} />
  if (path.startsWith('/admin')) page = <AdminPage {...pageProps} path={path} />

  return (
    <>
      <PublicHeader go={route.go} />
      <main>{page}</main>
      {!path.startsWith('/admin') && <PublicFooter go={route.go} />}
      <a className="whatsapp-float" href={whatsAppLink('Olá! Quero falar com a Gema Vita.')} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    </>
  )
}

function PublicHeader({ go }: { go: (path: string) => void }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => go('/')} aria-label="Ir para início">
        <img className="brand-logo" src={gemaVitaLogo} alt="" />
        <span><strong>Gema Vita</strong><small>nutrição que acompanha seu ritmo</small></span>
      </button>
      <nav>
        <button onClick={() => go('/cardapio')}>Cardápio</button>
        <button onClick={() => go('/vantagens?product=0001&batch=demo&flavor=frango')}>QR</button>
        <button onClick={() => go('/cliente')}>Fidelidade</button>
        <button onClick={() => go('/admin')}>Admin</button>
      </nav>
    </header>
  )
}

function PublicFooter({ go }: { go: (path: string) => void }) {
  return (
    <footer className="footer">
      <div>
        <strong>Gema Vita</strong>
        <p>Omeletes artesanais, quentes e prontos para acompanhar sua rotina.</p>
      </div>
      <div className="footer-actions">
        <button onClick={() => go('/cardapio')}>Ver cardápio</button>
        <button onClick={() => go('/contato')}>Contato</button>
      </div>
    </footer>
  )
}

function Button({ children, onClick, variant = 'primary', type = 'button' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'reward' | 'danger'; type?: 'button' | 'submit' }) {
  return <button type={type} onClick={onClick} className={`btn ${variant}`}>{children}</button>
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

function HomePage({ store, go }: { store: Store; go: (path: string) => void }) {
  const metrics = getMetrics(store)
  const benefits = [
    { title: 'Sai quente', text: 'Preparo rápido para café, almoço leve ou pausa no trabalho.', icon: '♨' },
    { title: 'Feito de verdade', text: 'Omeletes artesanais, recheados e pensados para rotina corrida.', icon: '✦' },
    { title: 'Suco incluso', text: 'Combo simples, completo e fácil de pedir sem surpresa no preço.', icon: '◐' },
    { title: 'QR com vantagem', text: 'Cada embalagem vira pontos, feedback e chance de recompensa.', icon: '⌁' },
  ]

  return (
    <div className="page home">
      <section className="hero-section home-hero">
        <div className="hero-copy">
          <span className="eyebrow">Omelete artesanal + suco incluso</span>
          <h1>Comida de verdade, pronta para o ritmo da sua manhã.</h1>
          <p>Gema Vita transforma omeletes quentes em uma experiência prática, nutritiva e rastreável: peça pelo WhatsApp, escaneie o QR da embalagem e acumule vantagens.</p>
          <div className="hero-tags" aria-label="Destaques da Gema Vita">
            <span>Entrega local</span>
            <span>A partir de {money(10)}</span>
            <span>Feedback em 30s</span>
          </div>
          <div className="actions">
            <Button onClick={() => go('/cardapio')}>Ver cardápio</Button>
            <Button variant="secondary" onClick={() => window.open(whatsAppLink('Olá! Quero pedir uma Gema Vita.'), '_blank')}>Pedir no WhatsApp</Button>
          </div>
        </div>
        <div className="hero-plate" aria-hidden="true">
          <div className="hero-orbit orbit-one">+20 pts</div>
          <img src={gemaVitaLogo} alt="" />
          <strong>nutrição que acompanha seu ritmo</strong>
          <div className="hero-orbit orbit-two">suco incluso</div>
        </div>
      </section>

      <section className="grid four benefits-grid" aria-label="Benefícios">
        {benefits.map((item) => <Card key={item.title} className="benefit-card"><span>{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p></Card>)}
      </section>

      <section className="section-heading split-heading"><div><span className="eyebrow">Cardápio enxuto</span><h2>Escolha seu recheio favorito.</h2></div><p>Todos acompanham suco e uma experiência rápida de fidelidade pelo QR da embalagem.</p></section>
      <ProductGrid />

      <section className="journey">
        <div>
          <span className="eyebrow light">Do pedido à vantagem</span>
          <h2>Como funciona</h2>
        </div>
        <ol>
          <li><strong>Escolha</strong><span>Veja o cardápio e peça direto pelo WhatsApp.</span></li>
          <li><strong>Receba</strong><span>Seu omelete chega quente, com suco e QR único.</span></li>
          <li><strong>Escaneie</strong><span>Responda um quiz curtinho sobre a experiência.</span></li>
          <li><strong>Ganhe</strong><span>Some pontos e participe de vantagens da Gema Vita.</span></li>
        </ol>
      </section>

      <section className="metrics-panel" aria-label="Métricas do MVP">
        <div>
          <span className="eyebrow">MVP rastreável por QR Code</span>
          <h2>Dados para melhorar cada lote.</h2>
          <p>A home também mostra o ciclo de feedback: QR lido, quiz respondido, cliente identificado e prêmio disponível.</p>
        </div>
        <div className="grid four metrics-strip">
          <Metric label="QR lidos" value={metrics.scans} />
          <Metric label="Quizzes" value={metrics.quizzes} />
          <Metric label="Clientes" value={store.customers.length} />
          <Metric label="Prêmios ativos" value={store.rewards.filter((r) => r.status === 'available').length} />
        </div>
      </section>
    </div>
  )
}

function ProductGrid() {
  return (
    <section className="grid products">
      {FLAVORS.map((product, index) => (
        <Card key={product.value} className="product-card">
          <span className="product-icon">{index < 2 ? '🥚' : '🍳'}</span>
          <div>
            <h3>{product.label}</h3>
            <p>{product.desc}</p>
          </div>
          <div className="product-footer">
            <strong>{money(product.price)}</strong>
            <a className="link-button" href={whatsAppLink(`Olá! Quero pedir ${product.label}.`)} target="_blank" rel="noreferrer">Pedir</a>
          </div>
        </Card>
      ))}
    </section>
  )
}

function MenuPage({ go }: { go: (path: string) => void }) {
  return (
    <div className="page">
      <section className="section-heading"><span className="eyebrow">Cardápio Gema Vita</span><h1>Todos acompanham suco.</h1><p>Preparados para entregar energia, sabor e praticidade.</p></section>
      <ProductGrid />
      <Card className="future-line"><h2>Próximas linhas</h2><p>Versão fit, tapioca, aveia, sem queijo e combos semanais.</p><Button onClick={() => go('/contato')}>Receber novidades</Button></Card>
    </div>
  )
}

function ContactPage({ go }: { go: (path: string) => void }) {
  return <div className="page narrow"><Card><h1>Fale com a Gema Vita</h1><p>Use o WhatsApp para pedidos, resgate de prêmios ou dúvidas rápidas.</p><div className="actions"><Button onClick={() => window.open(whatsAppLink('Olá! Vim pelo site da Gema Vita.'), '_blank')}>Abrir WhatsApp</Button><Button variant="secondary" onClick={() => go('/')}>Voltar</Button></div></Card></div>
}

function AdvantagesPage({ store, update, params, go }: { store: Store; update: (recipe: (draft: Store) => void) => void; params: URLSearchParams; go: (path: string) => void }) {
  const product = params.get('product') || '0001'
  const batch = params.get('batch') || 'demo'
  const flavor = (params.get('flavor') || 'frango') as Flavor
  const qrId = `${batch}-${product}`
  const qr = store.qrs.find((item) => item.id === qrId || (item.productNumber === product && item.batchId === batch))
  const canUse = !qr || !['quiz_completed', 'rewarded', 'redeemed', 'expired'].includes(qr.status)

  function registerScan() {
    update((draft) => {
      let item = draft.qrs.find((q) => q.id === qrId || (q.productNumber === product && q.batchId === batch))
      if (!item) {
        item = { id: qrId, productNumber: product, batchId: batch, flavor, shift: 'manha', status: 'created', url: window.location.pathname + window.location.search, createdAt: now(), used: false }
        draft.qrs.push(item)
      }
      if (item.status === 'created' || item.status === 'distributed') {
        item.status = 'scanned'
        item.scannedAt = now()
      }
    })
    go(`/quiz?product=${product}&batch=${batch}&flavor=${flavor}`)
  }

  return (
    <div className="page narrow qr-page">
      <Card>
        <span className="reward-badge">vantagem desbloqueada</span>
        <h1>Você desbloqueou uma vantagem Gema Vita 💛</h1>
        <p>Responda rapidinho e participe das vantagens de hoje. Leva menos de 30 segundos.</p>
        <div className="qr-summary">
          <span>Produto {product}</span><span>Lote {batch}</span><span>{flavorLabel(flavor)}</span>
        </div>
        {!canUse && <div className="notice danger">Este QR já foi concluído ou expirou.</div>}
        <div className="actions vertical">
          <Button onClick={registerScan} variant="reward">Responder quiz e ganhar pontos</Button>
          <Button variant="secondary" onClick={() => go('/cardapio')}>Ver cardápio</Button>
        </div>
      </Card>
    </div>
  )
}

function QuizPage({ update, params, go, setLastResult }: { update: (recipe: (draft: Store) => void) => void; params: URLSearchParams; go: (path: string) => void; setLastResult: (result: { reward: Reward | null; points: number; message: string }) => void }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', whatsapp: '', region: 'Centro', flavor: (params.get('flavor') as Flavor) || 'frango', rating: 'excelente', likedMost: 'Sabor', prefAnswer: 'sim' })
  const product = params.get('product') || '0001'
  const batch = params.get('batch') || 'demo'
  const qrId = `${batch}-${product}`
  const question = PREFERENCE_QUESTIONS[Math.abs(hashText(qrId)) % PREFERENCE_QUESTIONS.length]

  function submit(event: FormEvent) {
    event.preventDefault()
    if (step < 4) {
      setStep((current) => current + 1)
      return
    }
    const result = completeQuiz({ product, batch, qrId, form, question }, update)
    setLastResult(result)
    go('/quiz/resultado')
  }

  return (
    <div className="page narrow quiz-page">
      <Card>
        <div className="quiz-head"><span>Leva menos de 30 segundos</span><Progress value={(step / 4) * 100} /></div>
        <form onSubmit={submit}>
          {step === 1 && <div className="form-step"><h1>Dados básicos</h1><Input label="Nome" required value={form.name} onChange={(name) => setForm({ ...form, name })} /><Input label="WhatsApp obrigatório" required value={form.whatsapp} onChange={(whatsapp) => setForm({ ...form, whatsapp })} /><Select label="Região/local de compra" value={form.region} options={REGIONS} onChange={(region) => setForm({ ...form, region })} /></div>}
          {step === 2 && <div className="form-step"><h1>Como foi sua experiência?</h1><Select label="Qual sabor você comprou?" value={form.flavor} options={FLAVORS.map((f) => f.value)} getLabel={flavorLabel} onChange={(flavor) => setForm({ ...form, flavor: flavor as Flavor })} /><Select label="Como estava seu lanche?" value={form.rating} options={['excelente', 'bom', 'regular', 'pode_melhorar']} getLabel={(v) => v.replace('_', ' ')} onChange={(rating) => setForm({ ...form, rating })} /><Select label="O que você mais gostou?" value={form.likedMost} options={['Sabor', 'Quantidade', 'Preço', 'Suco incluso', 'Atendimento', 'Praticidade', 'Embalagem']} onChange={(likedMost) => setForm({ ...form, likedMost })} /></div>}
          {step === 3 && <div className="form-step"><h1>Pergunta rápida</h1><p className="question">{question}</p><div className="option-grid">{['sim', 'talvez', 'nao', 'depende_do_preco'].map((answer) => <button type="button" key={answer} className={form.prefAnswer === answer ? 'option selected' : 'option'} onClick={() => setForm({ ...form, prefAnswer: answer })}>{answer.replaceAll('_', ' ')}</button>)}</div></div>}
          {step === 4 && <div className="form-step"><h1>Agora vamos ver sua vantagem</h1><p>Obrigado por ajudar a Gema Vita a melhorar. Ao concluir, você ganha pontos e participa do sorteio de hoje.</p></div>}
          <div className="actions"><Button type="submit" variant={step === 4 ? 'reward' : 'primary'}>{step === 4 ? 'Ver minha vantagem' : 'Continuar'}</Button>{step > 1 && <Button variant="secondary" onClick={() => setStep((current) => current - 1)}>Voltar</Button>}</div>
        </form>
      </Card>
    </div>
  )
}

function completeQuiz(payload: { product: string; batch: string; qrId: string; question: string; form: { name: string; whatsapp: string; region: string; flavor: Flavor; rating: string; likedMost: string; prefAnswer: string } }, update: (recipe: (draft: Store) => void) => void) {
  let reward: Reward | null = null
  const points = 20
  const userId = `user_${payload.form.whatsapp.replace(/\D/g, '') || Date.now()}`
  const responseId = createId('response')
  const draw = Math.random()
  const rewardType: RewardType = draw < 0.01 ? 'voucher_50' : draw < 0.11 ? 'free_omelete' : 'none'

  update((draft) => {
    const existing = draft.customers.find((customer) => customer.whatsapp === payload.form.whatsapp)
    const customer = existing ?? { id: userId, name: payload.form.name, whatsapp: payload.form.whatsapp, region: payload.form.region, points: 0, level: 'bronze', totalQuizzes: 0, totalRewards: 0, totalPurchasesTracked: 0, lastInteractionAt: now() }
    customer.name = payload.form.name
    customer.region = payload.form.region
    customer.points += points
    customer.level = customer.points >= 300 ? 'gold' : customer.points >= 100 ? 'silver' : 'bronze'
    customer.totalQuizzes += 1
    customer.totalPurchasesTracked += 1
    customer.lastInteractionAt = now()
    if (!existing) draft.customers.push(customer)

    if (rewardType !== 'none') {
      reward = {
        id: createId('reward'),
        code: rewardType === 'voucher_50' ? `GV-VOUCHER-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : `GV-OMELETE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        userId: customer.id,
        customerName: customer.name,
        whatsapp: customer.whatsapp,
        qrCodeId: payload.qrId,
        batchId: payload.batch,
        type: rewardType,
        status: 'available',
        expiresAt: rewardType === 'free_omelete' ? new Date(Date.now() + 24 * 86400000).toISOString() : undefined,
        createdAt: now(),
      }
      draft.rewards.push(reward)
      customer.totalRewards += 1
    }

    draft.responses.push({
      id: responseId,
      qrCodeId: payload.qrId,
      batchId: payload.batch,
      productNumber: payload.product,
      userId: customer.id,
      customerName: customer.name,
      whatsapp: customer.whatsapp,
      region: payload.form.region,
      experience: { flavor: payload.form.flavor, rating: payload.form.rating, likedMost: payload.form.likedMost },
      preference: { question: payload.question, answer: payload.form.prefAnswer },
      pointsEarned: points,
      rewardId: reward?.id,
      createdAt: now(),
    })

    let qr = draft.qrs.find((item) => item.id === payload.qrId)
    if (!qr) {
      qr = { id: payload.qrId, productNumber: payload.product, batchId: payload.batch, flavor: payload.form.flavor, shift: 'manha', status: 'created', url: `/vantagens?product=${payload.product}&batch=${payload.batch}&flavor=${payload.form.flavor}`, createdAt: now(), used: false }
      draft.qrs.push(qr)
    }
    qr.status = reward ? 'rewarded' : 'quiz_completed'
    qr.quizCompletedAt = now()
    qr.used = true
  })

  return { reward, points, message: MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)] }
}

function QuizResultPage({ result, go }: { result: { reward: Reward | null; points: number; message: string } | null; go: (path: string) => void }) {
  if (!result) return <div className="page narrow"><Card><h1>Nenhum resultado recente.</h1><Button onClick={() => go('/')}>Voltar ao site</Button></Card></div>
  const reward = result.reward
  const title = reward?.type === 'voucher_50' ? 'Uau! Você ganhou um voucher de R$50 da Gema Vita 🎉' : reward?.type === 'free_omelete' ? 'Parabéns! Você ganhou 1 omelete completo Gema Vita 🥙' : 'Hoje não veio prêmio, mas sua participação valeu muito 💛'
  return (
    <div className="page narrow result-page"><Card><span className="reward-badge">+{result.points} pontos</span><h1>{title}</h1><p>{result.message}</p>{reward && <div className="code-box"><small>Código do prêmio</small><strong>{reward.code}</strong><span>{reward.expiresAt ? `Validade: ${new Date(reward.expiresAt).toLocaleString('pt-BR')}` : 'Voucher manual validado pelo WhatsApp'}</span></div>}<div className="actions vertical">{reward && <a className="link-button reward" href={whatsAppLink(`Olá! Ganhei uma vantagem Gema Vita. Código: ${reward.code}. Meu nome é ${reward.customerName}.`)} target="_blank" rel="noreferrer">Resgatar pelo WhatsApp</a>}<Button onClick={() => go('/cliente')}>Ver minha fidelidade</Button><Button variant="secondary" onClick={() => go('/')}>Voltar para o site</Button></div></Card></div>
  )
}

function ClientPage({ store, go }: { store: Store; go: (path: string) => void }) {
  const customer = store.customers.at(-1)
  if (!customer) return <div className="page narrow"><Card><h1>Painel do cliente</h1><p>Responda um quiz via QR para criar seu painel de pontos.</p><Button onClick={() => go('/vantagens?product=0001&batch=demo&flavor=frango')}>Simular QR</Button></Card></div>
  const nextLevel = customer.points < 100 ? 100 : customer.points < 300 ? 300 : customer.points
  return <div className="page"><section className="section-heading"><h1>Olá, {customer.name}</h1><p>Você tem {customer.points} pontos Gema Vita.</p></section><section className="grid four"><Metric label="Pontos" value={customer.points} /><Metric label="Nível" value={customer.level} /><Metric label="Quizzes" value={customer.totalQuizzes} /><Metric label="Prêmios" value={customer.totalRewards} /></section><Card><h2>Fidelidade</h2><Progress value={nextLevel ? Math.min(100, (customer.points / nextLevel) * 100) : 100} /><p>{customer.points < 300 ? `Faltam ${nextLevel - customer.points} pontos para o próximo nível.` : 'Você chegou no nível Ouro.'}</p></Card><section className="grid"><Card><h2>Histórico de respostas</h2>{store.responses.filter((r) => r.userId === customer.id).map((r) => <p key={r.id}>{new Date(r.createdAt).toLocaleDateString('pt-BR')} — {flavorLabel(r.experience.flavor)} — +{r.pointsEarned} pontos</p>)}</Card><Card><h2>Prêmios</h2>{store.rewards.filter((r) => r.userId === customer.id).map((r) => <p key={r.id}>{rewardLabel(r.type)} — {r.code} — {r.status}</p>)}{store.rewards.filter((r) => r.userId === customer.id).length === 0 && <p>Nenhum prêmio ainda.</p>}</Card></section></div>
}

function AdminPage({ store, update, reset, path }: { store: Store; update: (recipe: (draft: Store) => void) => void; reset: () => void; path: string; go: (path: string) => void }) {
  const metrics = getMetrics(store)
  return (
    <div className="admin-shell">
      <aside><div className="brand admin-brand"><img className="brand-logo" src={gemaVitaLogo} alt="" /><span><strong>Admin</strong><small>operação simples</small></span></div><a href="/admin">Dashboard</a><a href="/admin/lotes">Lotes e QR</a><a href="/admin/saidas">Saídas</a><a href="/admin/premios">Prêmios</a><a href="/admin/analytics">Analytics</a><a href="/admin/ranking">Ranking</a><button onClick={reset}>Reset demo</button></aside>
      <section className="admin-content">
        {path === '/admin/lotes' ? <AdminBatches store={store} update={update} /> : path === '/admin/saidas' ? <AdminOutputs store={store} update={update} /> : path === '/admin/premios' ? <AdminRewards store={store} update={update} /> : path === '/admin/analytics' ? <AdminAnalytics store={store} /> : path === '/admin/ranking' ? <AdminRanking store={store} /> : <AdminDashboard store={store} metrics={metrics} />}
      </section>
    </div>
  )
}

function AdminDashboard({ store, metrics }: { store: Store; metrics: ReturnType<typeof getMetrics> }) {
  return <><h1>Dashboard operacional</h1><section className="grid admin-metrics"><Metric label="Produtos distribuídos" value={metrics.distributed} /><Metric label="QR Codes lidos" value={metrics.scans} /><Metric label="Quizzes concluídos" value={metrics.quizzes} /><Metric label="Clientes novos" value={store.customers.length} /><Metric label="Clientes recorrentes" value={store.customers.filter((c) => c.totalQuizzes > 1).length} /><Metric label="Prêmios ativos" value={store.rewards.filter((r) => r.status === 'available').length} /></section><section className="grid"><Card><h2>Sabores mais fortes</h2>{topList(store.outputs.map((o) => ({ key: flavorLabel(o.flavor), value: o.quantity })))}</Card><Card><h2>Regiões mais fortes</h2>{topList(store.outputs.map((o) => ({ key: o.region, value: o.quantity })))}</Card></section></>
}

function AdminBatches({ store, update }: { store: Store; update: (recipe: (draft: Store) => void) => void }) {
  const [qty, setQty] = useState('10')
  const [flavor, setFlavor] = useState<Flavor>('frango_com_queijo')
  function createBatch() { update((draft) => { const code = `GV-${weekCode()}-${String(draft.batches.length + 1).padStart(3, '0')}`; draft.batches.push({ id: code, code, week: weekCode(), startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), totalProduced: Number(qty), status: 'active', createdAt: now() }) }) }
  function generateQr(batchId: string) { update((draft) => { const start = draft.qrs.filter((q) => q.batchId === batchId).length; Array.from({ length: Number(qty) || 1 }, (_, index) => { const productNumber = String(start + index + 1).padStart(4, '0'); const id = `${batchId}-${productNumber}`; draft.qrs.push({ id, productNumber, batchId, flavor, shift: 'manha', status: 'created', url: `/vantagens?product=${productNumber}&batch=${batchId}&flavor=${flavor}`, createdAt: now(), used: false }) }) }) }
  return <><h1>Lotes e QR Codes</h1><Card><h2>Criar lote / gerar QR</h2><div className="inline-form"><Input label="Quantidade" value={qty} onChange={setQty} /><Select label="Sabor" value={flavor} options={FLAVORS.map((f) => f.value)} getLabel={flavorLabel} onChange={(v) => setFlavor(v as Flavor)} /><Button onClick={createBatch}>Criar lote</Button></div></Card><Card><h2>Lotes</h2><div className="table">{store.batches.map((batch) => <div className="row" key={batch.id}><span>{batch.code}</span><span>{batch.status}</span><span>{batch.totalProduced} produzidos</span><span>{store.qrs.filter((q) => q.batchId === batch.id).length} QRs</span><Button onClick={() => generateQr(batch.id)}>Gerar QR</Button></div>)}</div></Card><Card><h2>QR Codes</h2><div className="table compact">{store.qrs.map((qr) => <div className="row" key={qr.id}><span>{qr.id}</span><span className={`status ${qr.status}`}>{qr.status}</span><span>{flavorLabel(qr.flavor)}</span><code>{qr.url}</code></div>)}</div></Card></>
}

function AdminOutputs({ store, update }: { store: Store; update: (recipe: (draft: Store) => void) => void }) {
  const [form, setForm] = useState({ batchId: store.batches[0]?.id ?? '', flavor: 'frango' as Flavor, quantity: '10', region: 'Centro', seller: 'Italo', deliveryType: 'vendedor' as BatchOutput['deliveryType'], shift: 'manha' as 'manha' | 'tarde' })
  function submit() { update((draft) => { draft.outputs.push({ id: createId('output'), batchId: form.batchId, flavor: form.flavor, quantity: Number(form.quantity), region: form.region, seller: form.seller, deliveryType: form.deliveryType, shift: form.shift, createdAt: now() }) }) }
  return <><h1>Registro de saídas</h1><Card><div className="inline-form"><Select label="Lote" value={form.batchId} options={store.batches.map((b) => b.id)} onChange={(batchId) => setForm({ ...form, batchId })} /><Select label="Sabor" value={form.flavor} options={FLAVORS.map((f) => f.value)} getLabel={flavorLabel} onChange={(flavor) => setForm({ ...form, flavor: flavor as Flavor })} /><Input label="Quantidade" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} /><Select label="Região" value={form.region} options={REGIONS} onChange={(region) => setForm({ ...form, region })} /><Input label="Vendedor" value={form.seller} onChange={(seller) => setForm({ ...form, seller })} /><Button onClick={submit}>Registrar saída</Button></div></Card><Card><h2>Saídas registradas</h2><div className="table">{store.outputs.map((output) => <div className="row" key={output.id}><span>{output.batchId}</span><span>{flavorLabel(output.flavor)}</span><span>{output.quantity}</span><span>{output.region}</span><span>{output.seller}</span></div>)}</div></Card></>
}

function AdminRewards({ store, update }: { store: Store; update: (recipe: (draft: Store) => void) => void }) {
  const [query, setQuery] = useState('')
  const rewards = store.rewards.filter((r) => !query || r.code.toLowerCase().includes(query.toLowerCase()))
  function setStatus(id: string, status: RewardStatus) { update((draft) => { const reward = draft.rewards.find((r) => r.id === id); if (reward) { reward.status = status; reward.redeemedAt = status === 'redeemed' ? now() : reward.redeemedAt; const qr = draft.qrs.find((q) => q.id === reward.qrCodeId); if (qr && status === 'redeemed') qr.status = 'redeemed' } }) }
  return <><h1>Validação de prêmios</h1><Card><Input label="Buscar código do prêmio" value={query} onChange={setQuery} /></Card><Card><div className="table">{rewards.map((reward) => <div className="row" key={reward.id}><span>{reward.code}</span><span>{reward.customerName}</span><span>{rewardLabel(reward.type)}</span><span className={`status ${reward.status}`}>{reward.status}</span><Button onClick={() => setStatus(reward.id, 'redeemed')}>Marcar resgatado</Button><Button variant="danger" onClick={() => setStatus(reward.id, 'cancelled')}>Cancelar</Button></div>)}{rewards.length === 0 && <p>Nenhum prêmio encontrado.</p>}</div></Card></>
}

function AdminAnalytics({ store }: { store: Store }) {
  const metrics = getMetrics(store)
  return <><h1>Analytics</h1><section className="grid four"><Metric label="Scan rate" value={`${metrics.scanRate.toFixed(1)}%`} /><Metric label="Quiz completion" value={`${metrics.quizRate.toFixed(1)}%`} /><Metric label="Prêmio rate" value={`${metrics.rewardRate.toFixed(1)}%`} /><Metric label="WhatsApp opt-in" value={`${metrics.quizzes ? 100 : 0}%`} /></section><section className="grid"><Card><h2>Scans por status</h2>{topList(store.qrs.map((q) => ({ key: q.status, value: 1 })))}</Card><Card><h2>Preferências do quiz</h2>{topList(store.responses.map((r) => ({ key: r.preference.answer, value: 1 })))}</Card></section></>
}

function AdminRanking({ store }: { store: Store }) {
  const winners = store.rewards.filter((reward) => reward.type !== 'none')
  return <><h1>Ranking de premiados</h1><Card>{winners.map((reward) => <p key={reward.id}>{partialName(reward.customerName)} ganhou {rewardLabel(reward.type)} em {new Date(reward.createdAt).toLocaleDateString('pt-BR')}.</p>)}{winners.length === 0 && <p>Ainda não há premiados.</p>}</Card></>
}

function Input({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="field"><span>{label}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function Select({ label, value, options, onChange, getLabel = (v: string) => v }: { label: string; value: string; options: string[]; onChange: (value: string) => void; getLabel?: (value: string) => string }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{getLabel(option)}</option>)}</select></label>
}

function Progress({ value }: { value: number }) {
  return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card className="metric"><strong>{value}</strong><span>{label}</span></Card>
}

function getMetrics(store: Store) {
  const distributed = store.outputs.reduce((sum, output) => sum + output.quantity, 0)
  const scans = store.qrs.filter((qr) => ['scanned', 'quiz_started', 'quiz_completed', 'rewarded', 'redeemed'].includes(qr.status)).length
  const quizzes = store.responses.length
  const rewards = store.rewards.length
  return { distributed, scans, quizzes, rewards, scanRate: distributed ? (scans / distributed) * 100 : 0, quizRate: scans ? (quizzes / scans) * 100 : 0, rewardRate: quizzes ? (rewards / quizzes) * 100 : 0 }
}

function topList(items: { key: string; value: number }[]) {
  const grouped = items.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.key]: (acc[item.key] ?? 0) + item.value }), {})
  return <div className="mini-bars">{Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([key, value]) => <p key={key}><span>{key}</span><strong>{value}</strong></p>)}</div>
}

function rewardLabel(type: RewardType) {
  if (type === 'free_omelete') return 'omelete grátis'
  if (type === 'voucher_50') return 'voucher R$50'
  return 'sem prêmio'
}

function partialName(name: string) {
  const parts = name.trim().split(' ')
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)?.[0]}.` : `${parts[0]} G.`
}

function whatsAppLink(message: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`
}

export default App
