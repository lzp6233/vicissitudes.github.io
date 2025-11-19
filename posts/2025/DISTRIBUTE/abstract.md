# 分布式系统抽象与广播协议

> 摘要：分布式系统中的抽象层次、通信模型、故障检测与广播协议

- 日期：2025-11-16
- 标签：分布式系统, 抽象, 广播协议, 故障检测

---

## Lecture 9：Abstractions（抽象）

### 1. 课程脉络与目标

- **分布式计算中的抽象**：通过分层与抽象（进程、通信、时间、失败）来简化系统推理与算法设计
- **核心能力**：在不直接访问"全局状态"的前提下，通过规范（spec）与性质（properties）证明算法正确性与鲁棒性

### 2. 归并排序示例与并行视角

- **示例序列**：`[3,5,2,6,4,1,8,7]` - 先"分解"，再"自底向上合并"
- **启发**：并行/多线程下的分治结构直观地体现"抽象分层"（任务划分与合并阶段），有助于理解后续"通信与事件驱动"的风格

### 3. 可用性与 SLA

- **SLA 对应的停机时间**：99.9% 与 99.99% 的日/周/月/年停机时间量化
- **要点**：高可用的工程目标需要与下层抽象（通信、失败模型）配合才能达成

### 4. 进程与事件驱动计算模型

#### 4.1 进程与通信（Processes and Communication）

- 系统由一组进程与点对点消息通道构成
- 将每一个节点可以抽象为一个状态机

#### 4.2 本地步骤（Local Steps）

- **发送事件**：将消息放入 `outbuf_i[j]`
- **接收事件**：从 `inbuf_i[*]` 取出消息
- **计算事件**：本地计算使状态从 `S` 变为 `S' = f(S, m)`

#### 4.3 消息传递（Message Passing）

- **`Outbuf_i[j]`**：`p_i` 发给 `p_j` 但尚未投递的消息
- **`Inbuf_i[j]`**：来自 `p_j`、已投递到 `p_i` 但未处理的消息

#### 4.4 执行与配置（Executions and Configurations）

- **执行（Executions）**：一系列步骤序列
- **配置（Configurations）**：全局向量状态 `C = (S1, S2, …, Sn)`
- **重要**：进程不可见全局状态，但用于推理正确性
- **演化过程**：执行捕获全局状态的演化 `C_0, s_1, C_1, s_2, C_2, ...`   

### 5. 接口规范示例：JobHandler

#### 5.1 接口与性质

- **Name**: `jobhandler/instance jh`
- **Request**: `< jh, Submit | job >`
- **Indication**: `< jh, Confirm | job >`（可以异步处理）
- **性质 JH1**：每个提交最终都会被确认（保证响应）

#### 5.2 同步版本（Synchronous JobHandler）

**事件驱动风格**：收到 `Submit` 即处理并 `Confirm`

```
upon event <jh, Submit | job> do
    process(job);
    trigger <jh, Confirm | job>;
```

#### 5.3 异步版本（Asynchronous JobHandler）

使用缓冲 `buffer`；提交即入队触发确认，后台按策略取出处理

```
upon event <jh, Init> do 
    buffer := ∅;
    
upon event <jh, Submit | job> do
    buffer := buffer ∪ {job};
    trigger <jh, Confirm | job>;
    
upon buffer ≠ ∅ do 
    job := selectjob(buffer);
    process(job);
    buffer := buffer \ {job};
```

#### 5.4 要点

同一规范可有不同实现；"接口+性质"是抽象的核心

### 6. 失败抽象（Failure Models）

#### 6.1 失败类型

- **Crash（崩溃停止）**（本课程主要考虑）
  - 进程停止（可能在发送中途停止）
  - 整体上好的效果：不依赖坏的节点去得到结果

- **Crash-Recovery（崩溃恢复）**
  - 可反复崩溃并恢复继续执行

- **Omission（遗漏）**
  - 应发/应收的消息被遗漏（网络/缓冲问题）

- **Byzantine（拜占庭）**
  - 任意/恶意行为
  - 若"带认证"则不可破坏签名等密码原语

#### 6.2 层级关系

Byzantine 最强，Crash/Crash-Recovery、Omission 为较弱类

### 7. 通信抽象与可靠传输

#### 7.1 Fair-Loss Links（`fll`）- 类 UDP（基础层）

**性质**：

- **FLL1. Fair-loss（公平丢失）**
  - 如果正确进程 p 无限次发送消息 m 给正确进程 q，则 q 无限次投递 m

- **FLL2. Finite duplication（有限重复）**
  - 如果正确进程 p 有限次发送消息 m 给进程 q，则 m 不能被 q 无限次投递

- **FLL3. No creation（无创造）**
  - 如果进程 q 投递了来自 p 的消息 m，则 m 之前确实由 p 发送给 q

**接口**：

- **Request**: `<fll, Send | q, m>` - 请求发送消息 m 给进程 q
- **Indication**: `<fll, Deliver | p, m>` - 投递来自进程 p 的消息 m
- **Stubborn Links（`sl`）**：（构造）
  
  - 顽固传递：发送一次，收端会被“无限次投递”（依赖重传）。
  
  - 实现思路：`Retransmit Forever`（周期性重传、维护 `sent` 集）。
  
    - > upon event <sl, Init> do
      >
      > ​	sent := $\emptyset$;
      >
      > ​	starttimer($\Delta$);
      >
      > upon event <timeout> do
      >
      > ​	forall (q,m) $\in$ Sent do
      >
      > ​	trigger <fll, send | q, m> ;
      >
      > ​	starttimer($\Delta$);
      >
      > upon event <sl, Send | q, m> do
      >
      > ​	trigger <fll, send | q,m> ;
      >
      > ​	sent = sent $\cup$ {(q,m)}
      >
      > upon event <fll, Deliver | p, m> do
      >
      > ​	trigger <sl, deliver | p, m>;
- **Perfect Links（`pl`）**（类 TCP）：
  - 可靠投递、无重复、无创造。

  - 构造

  - upon event $ \langle \text{pl, Init} \rangle $ do  
     delivered := $ \emptyset $;

    upon event $ \langle \text{pl, Send | q, m} \rangle $ do  
     trigger $ \langle \text{sl, Send | q, m} \rangle $;

    upon event $ \langle \text{sl, Deliver | p, m} \rangle $ do  
     if m $ \notin $ delivered then  
      delivered := delivered $ \cup $ {m};  
      trigger $ \langle \text{pl, Deliver | p, m} \rangle $;

  - **课程默认**：异步消息传递 + 完美链路（非 FIFO 保证）。

### 时间假设与模型
- **关注**：通信延迟、进程速度、时钟漂移是否有上界。

- **同步模型**：强时间上界（在工程中难以完全满足）。(比特币实现)

  - 发送与接收的延迟上限$\Delta_{delay}$
  - 进程时间上界$\Delta_{proc}$
  - 时间偏移量$\Delta_{drift}$
  - $\Delta = \Delta_{delay}+\Delta_{proc}+\Delta_{drift}$

- **异步模型**：无时间上界；比特币被提及为“弱同步/概率同步”的启发。

  - 没有延迟的上限
  - 可能导致默写问题不可解

- 半同步/最终同步：现实实现 in between

  - Formally, propagation delay(∆_delay) and process speed( ∆_proc) are bounded after some unknown time

  - $\Delta = \Delta_{proc}+\Delta_{delay}$

    Or, ∆ is not known a priori

  + >**upon event** < P, Init > **do**
    >
    > alive := Π;(全集)
    >
    > detected := ∅;
    >
    > starttimer(2∆);
    >
    >
    >
    >**upon event** < Timeout > **do**
    >
    > **forall** p ∈ Π **do**
    >
    > **if** (p ∉ alive) ∧ (p ∉ detected) **then**
    >
    > detected := detected ∪ {p};
    >
    > **trigger** < P, Crash | p >;
    >
    > **trigger** < pl, Send | p, [HEARTBEAT_REQUEST] >;
    >
    > alive := ∅;
    >
    > starttimer(2∆);
    >
    >
    >
    >**upon event** < pl, Deliver | q, [HEARTBEAT_REQUEST] > **do**
    >
    > **trigger** < pl, Send | q, [HEARTBEAT_REPLY] >;
    >
    >
    >
    >**upon event** < pl, Deliver | p, [HEARTBEAT_REPLY] > **do**
    >
    > alive := alive ∪ {p};

## abstracting time

### 故障检测器（Failure Detectors, FD）

- **动机**：异步系统中，仅靠超时很难可靠地区分“进程崩溃”与“网络问题”。

- **抽象**：FD 提供关于崩溃的“提示”，准确性/完备性取决于时间假设。

- **性质**：
  
  - Indication:`<P, Crash| p>`,Detects that process p has crashed
  - 完备性（Completeness）：崩溃最终会被检测到；
  - 准确性（Accuracy）：不误报未崩溃的进程。
  
- **完美故障检测器（`P`）**：
  - 强完备 + 强准确；
  - 典型算法：基于心跳与超时的“排除（Exclude on Timeout）”。
  
- **最终完美故障检测器（`◇P`）**：
  
  - Indication: $ \langle \Diamond P,\ \text{Suspect} \mid p \rangle $: Notifies that process p is suspected to have crashed.
    
    Indication: $ \langle \Diamond P,\ \text{Restore} \mid p \rangle $: Notifies that process p is not suspected anymore.
    
  - 强完备 + 最终强准确（超时阈值逐步增大以覆盖未知Δ）。
  
  - 典型算法：`Increasing Timeout`。
  
  - > **upon event** < ◇P, Init > **do**
    >
    >  alive := Π;
    >
    >  suspected := ∅;
    >
    >  delay := 2∆’;
    >
    >  starttimer(delay);
    >
    > 
    >
    > **upon event** < Timeout > **do**
    >
    >  **if** alive ∩ suspected ≠ ∅ **then**
    >
    >  delay := delay + 2∆’;
    >
    >  **forall** p ∈ Π **do**
    >
    >  **if** (p ∉ alive) ∧ (p ∉ suspected) **then**
    >
    >  suspected := suspected ∪ {p};
    >
    >  **trigger** < ◇P, Suspect | p >;
    >
    >  **else if** (p ∈ alive) ∧ (p ∈ suspected) **then**
    >
    >  suspected := suspected \ {p};
    >
    >  **trigger** < ◇P, Restore | p >;
    >
    >  **trigger** < pl, Send | p, [HEARTBEAT_REQUEST] >;
    >
    >  alive := ∅;
    >
    >  starttimer(delay);
    >
    > 
    >
    > **upon event** < pl, Deliver | q, [HEARTBEAT_REQUEST] > **do**
    >
    >  **trigger** < pl, Send | q, [HEARTBEAT_REPLY] >;
    >
    > 
    >
    > **upon event** < pl, Deliver | p, [HEARTBEAT_REPLY] > **do**
    >
    >  alive := alive ∪ {p};

### 选主（Leader Election）与最终领导者检测（`Ω`）

- **选主规范**：
  - 最终某个正确进程被全体承认为唯一领导者；
  - 为什么需要领导者：集中协调、资源调度、共识驱动等；
  - 风险：领导者失效需重选、可能形成瓶颈。
- **`Ω` 抽象**：
  - 最终准确与一致：最终所有正确进程信任同一正确领导者。

### 本讲要点
- 使用“接口+性质”描述抽象并解耦实现；
- 明确失败与链路模型，选择合适的传输与检测机制；
- 在异步系统中，可靠的失败信息通常只能“最终正确”。

---

## 附：术语与缩写速查
- **BEB/RB/URB**：最努力/可靠/一致可靠广播；
- **P/◇P/Ω**：完美/最终完美 故障检测器、最终领导者检测器；
- **pl/fll/sl**：完美/公平丢失/顽固 链路抽象；
- **Agreement（协议一致性）**：若一人投递，众人最终也投递；
- **Uniform Agreement（统一一致性）**：即便故障进程投递，正确进程最终也都投递；
- **Safety/Liveness**：安全/活性；前者“不出错”，后者“能推进”。 

