import { Component, computed, HostListener, Signal, signal, WritableSignal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';


 type MonthRow = { date: Date; key: string; label: string };
type SignalNumber = Signal<number>;
type SignalName = Signal<String>;

interface SubCategory {
  name: SignalName;
  values: SignalNumber[]; // one Signal<number> per month
}

interface ParentCategory {
  name: Signal<string>;
  items: SubCategory[];
}

interface applyField {
  type: string;
  parentIndex:number;
  selectedIndex: number;
  selectedValue: number; // one Signal<number> per month
}


@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [RouterModule, NgFor, ReactiveFormsModule, NgIf , NgClass],
  templateUrl: './budget.component.html',
  styleUrl: './budget.component.css'
})


export class BudgetComponent {  


  year : number = new Date().getFullYear();
  selectedField: applyField = {type: "", parentIndex: 0, selectedIndex: 0 , selectedValue: 0}

  startMonthModel = '';
  endMonthModel = '';


  private _start = signal(new Date(this.year, 0, 1));
  private _end = signal(new Date(this.year, 11, 1));

 
  private _incomeParents = signal<ParentCategory[]>([]);
  private _expenseParents = signal<ParentCategory[]>([]);

  showContextMenu: boolean = false;
  contextMenuPosition = { x: 0, y: 0 };

  incomeCategories() {
    return this._incomeParents();
  }

  expenseCategories() {
    return this._expenseParents();
  }

   constructor() { 
    }

    ngOnInit(): void {
      this.addIncomeParent();
      }


  private createSub(name = signal('')): SubCategory {
    return { name, values: [] };
  }

  monthKeyFromDate(d: Date){ return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}` }

  months = computed<MonthRow[]>(() => {
    const arr = this.rangeMonths(this._start(), this._end());
    return arr.map((d) => ({
      date: d,
      key: this.monthKeyFromDate(d),
      label: d.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    }));
  });

      onStartChange(e: Event) {
      const v = (e.target as HTMLInputElement).value;
      if (!v) return;
      this.startMonthModel = v;
      console.log("Start Date"+this.startMonthModel);
      const [y, m] = v.split('-').map((s) => parseInt(s, 10));
      this._start.set(new Date(y, m - 1, 1));
      // resize all values to match new months
      this.syncAllCategoryValuesToMonths();
    }

    onEndChange(e: Event) {
      const v = (e.target as HTMLInputElement).value;
      if (!v) return;
      this.endMonthModel = v;
      const [y, m] = v.split('-').map((s) => parseInt(s, 10));
      this._end.set(new Date(y, m - 1, 1));
      this.syncAllCategoryValuesToMonths();
    }

     startMonth() {
    return this.startMonthModel;
  }
  endMonth() {
    return this.endMonthModel;
  }

   ngAfterViewInit(): void {

    this.syncAllCategoryValuesToMonths();
  }

  rangeMonths(start: Date, end: Date): Date[] {
  const arr: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    arr.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return arr;
}

  monthCount() {
    return this.months().length;
  }

addIncomeParent() {
    const newParent: ParentCategory = { name: signal(''), items: [] };
    // ensure new values have signals for existing months
    this._incomeParents.update((arr) => {
      newParent.items.forEach((s) => {
        s.values = Array.from({ length: this.monthCount() }, () => signal(0));
      });
      return [...arr, newParent];
    });
  }

  addIncomeSub(parentIndex: number) {
    this._incomeParents.update((arr) => {
      const copy = [...arr];
      const p = copy[parentIndex];
      const sub = this.createSub();
      sub.values = Array.from({ length: this.monthCount() }, () => signal(0));
      p.items = [...p.items, sub];
      return copy;
    });
  }

  updateSubValue(type: 'income' | 'expense', parentIndex: number , subIndex: number, evt: Event){
    const raw = (evt.target as HTMLInputElement).value;
    const newSub: SubCategory = { name: signal(''), values: [] };

    if(type == 'income'){

      this._incomeParents.update((arr) => {
      const copy = [...arr];
      const p = copy[parentIndex];
      newSub.name = signal(raw);
      
      newSub.values = Array.from({ length: this.monthCount() }, () => signal(0)); //Should not make 0 after editing the name 
      p.items[subIndex] =  newSub;
   
      return copy;
    });

    }else{
        this._expenseParents.update((arr) => {
      const copy = [...arr];
      const p = copy[parentIndex];
      newSub.name = signal(raw);
      newSub.values 
      = Array.from({ length: this.monthCount() }, () => signal(0));
      p.items[subIndex] =  newSub;
   
      return copy;
    });
    }
  }

  removeSubValue(type: 'income' | 'expense', parentIndex: number , subIndex: number, evt: Event){
    const raw = (evt.target as HTMLInputElement).value;
    const newSub: SubCategory = { name: signal(''), values: [] };

    if(type == 'income'){

      this._incomeParents.update((arr) => {
      const copy = [...arr];
      const p = copy[parentIndex];
      newSub.name = signal(raw);
      newSub.values = Array.from({ length: this.monthCount() }, () => signal(0));
      p.items[subIndex] =  newSub;
      p.items.splice(subIndex, 1);
   
      return copy;
    });

    }
    else{
         this._expenseParents.update((arr) => {
      const copy = [...arr];
      const p = copy[parentIndex];
      newSub.name = signal(raw);
      newSub.values = Array.from({ length: this.monthCount() }, () => signal(0));
      p.items[subIndex] =  newSub;
      p.items.splice(subIndex, 1);
   
      return copy;
    });
    }
   

  }



  updateValue(
    type: 'income' | 'expense',
    parentIndex: number,
    subIndex: number,
    monthIndex: number,
    evt: Event
  ) {
    const raw = (evt.target as HTMLInputElement).value;
    // allow negative values, decimals
    const cleaned = raw.replace(/[^\d\-\.\,]/g, '').replace(',', '.');
    const n = cleaned === '' ? 0 : parseFloat(cleaned);
    const val = isNaN(n) ? 0 : n;

    if (type === 'income') {
      const parents = this._incomeParents();
      const target = parents[parentIndex]?.items?.[subIndex];
      if (!target) return;
      // defensive: if month index out of bounds, expand
      if (!target.values[monthIndex]) {
        target.values[monthIndex] = signal(val);
        this._incomeParents.set([...parents]);
      } else {
         target.values[monthIndex] = signal(val);
      }
    } else {
      const parents = this._expenseParents();
      const target = parents[parentIndex]?.items?.[subIndex];
      if (!target) return;
      if (!target.values[monthIndex]) {
        target.values[monthIndex] = signal(val);
        this._expenseParents.set([...parents]);
      } else {
        target.values[monthIndex] = signal(val);
      }
    }
  }
  
  updateParentValue(type: 'income' | 'expense',
    parentIndex: number,
    evt: Event){
    const raw = (evt.target as HTMLInputElement).value;

    if (type === 'income') {

      const newParent: ParentCategory = { name: signal(''), items: [] };

      newParent.name = signal(raw);
      newParent.items = [];

      this._incomeParents.update(items => [
      ...items.slice(0, parentIndex), 
      { ...items[parentIndex], name: signal(raw) }, 
      ...items.slice(parentIndex + 1), 
    ]);
    }else{
       const newParent: ParentCategory = { name: signal(''), items: [] };

      newParent.name = signal(raw);
      newParent.items = [];

      this._expenseParents.update(items => [
      ...items.slice(0, parentIndex), 
      { ...items[parentIndex], name: signal(raw) }, 
      ...items.slice(parentIndex + 1), 
    ]);
    }

  }

   private syncAllCategoryValuesToMonths() {
    const monthCount = this.months().length;

    const ensureForParentList = (parents: ParentCategory[]) => {
      parents.forEach((p) => {
        p.items.forEach((s) => {
          // if current values length differs from monthCount, resize preserving old values
          const old = s.values || [];
          const newVals: SignalNumber[] = [];
          for (let i = 0; i < monthCount; i++) {
            if (old[i]) {
              // reuse existing signal
              newVals.push(old[i]);
            } else {
              // create a new signal with default 0
              newVals.push(signal(0));
            }
          }
          s.values = newVals;
        });
      });
    };

    const inc = this._incomeParents();
    const exp = this._expenseParents();
    ensureForParentList(inc);
    ensureForParentList(exp);

    // set back (mutated objects replaced so change detection occurs)
    this._incomeParents.set([...inc]);
    this._expenseParents.set([...exp]);

    // Optionally seed demo numbers after initial sync (only if all zeros)
    this.seedDemoNumbersIfEmpty();
  }

   private seedDemoNumbersIfEmpty() {
    const monthsCount = this.months().length;
    if (monthsCount < 1) return;


    const hasNonZero = this._incomeParents().some((p) =>
      p.items.some((s) => s.values.some((sig) => sig() !== 0))
    );
    if (hasNonZero) return;

    const m0 = 0;
    const m1 = monthsCount > 1 ? 1 : 0;

    const inc = this._incomeParents();
 
    const gen = inc[0]?.items;
    if (gen && gen.length >= 2) {
      gen[0].values[m0].apply(200);
      if (m1 !== m0) gen[0].values[m1].apply(400);
      gen[1].values[m0].apply(0);
      if (m1 !== m0) gen[1].values[m1].apply(200);
    }

    const other = inc[1]?.items;
    if (other && other.length >= 2) {
      other[0].values[m0].apply(500);
      if (m1 !== m0) other[0].values[m1].apply(550);
      other[1].values[m0].apply(500);
      if (m1 !== m0) other[1].values[m1].apply(600);
    }
    this._incomeParents.set([...inc]);

    const exp = this._expenseParents();
   
    const op = exp[0]?.items;
    if (op && op.length >= 2) {
      op[0].values[m0].apply(100);
      if (m1 !== m0) op[0].values[m1].apply(200);
      op[1].values[m0].apply(200);
      if (m1 !== m0) op[1].values[m1].apply(400);
    }
   
    const sal = exp[1]?.items;
    if (sal && sal.length >= 3) {
      sal[0].values[m0].apply(100);
      if (m1 !== m0) sal[0].values[m1].apply(120);
      sal[1].values[m0].apply(80);
      if (m1 !== m0) sal[1].values[m1].apply(80);
      sal[2].values[m0].apply(20);
      if (m1 !== m0) sal[2].values[m1].apply(0);
    }
    this._expenseParents.set([...exp]);
  }

  addExpenseParent() {
    const newParent: ParentCategory = { name: signal(''), items: [] };
    this._expenseParents.update((arr) => {
      newParent.items.forEach((s) => (s.values = Array.from({ length: this.monthCount() }, () => signal(0))));
      return [...arr, newParent];
    });
  }

  addExpenseSub(parentIndex: number) {
    this._expenseParents.update((arr) => {
      const copy = [...arr];
      const p = copy[parentIndex];
      const sub = this.createSub();
      sub.values = Array.from({ length: this.monthCount() }, () => signal(0));
      p.items = [...p.items, sub];
      return copy;
    });
  }

  incomeSubTotal(parent: ParentCategory, monthIndex: number) {
    return this.sumParentMonth(parent, monthIndex);
  }
   expenseSubTotal(parent: ParentCategory, monthIndex: number) {
    return this.sumParentMonth(parent, monthIndex);
  }

   private sumParentMonth(parent: ParentCategory, mi: number) {
    if (!parent?.items?.length) return 0;
    return parent.items.reduce((acc, s) => acc + (s.values[mi] ? s.values[mi]() : 0), 0);
  }

   totalIncome(monthIndex: number) {
    return this._incomeParents().reduce((acc, p) => acc + this.sumParentMonth(p, monthIndex), 0);
  }

  totalExpenses(monthIndex: number) {
    return this._expenseParents().reduce((acc, p) => acc + this.sumParentMonth(p, monthIndex), 0);
  }

  profitLoss(monthIndex: number) {
    return this.totalIncome(monthIndex) - this.totalExpenses(monthIndex);
  }

  /* Opening balance: opening for first month = 0; subsequent months opening = previous closing */
  openingBalance(monthIndex: number) {
    if (monthIndex === 0) return 0;
    // sum prior months' profit/loss cumulatively
    let running = 0;
    for (let i = 0; i < monthIndex; i++) {
      running += this.profitLoss(i);
    }
    return running;
  }

  closingBalance(monthIndex: number) {
    return this.openingBalance(monthIndex) + this.profitLoss(monthIndex);
  }


   /* -------------------- Apply All Functionality -------------------- */

    onRightClick(type: 'income' | 'expense',
     event: MouseEvent, parentIndex:number, subIndex: number, value: number): void {
      event.preventDefault(); // Prevent default browser context menu
      this.selectedField.type= type;
      this.selectedField.parentIndex = parentIndex
      this.selectedField.selectedIndex = subIndex;
      this.selectedField.selectedValue = value;
        this.showContextMenu = true;
        this.contextMenuPosition.x = event.clientX;
        this.contextMenuPosition.y = event.clientY;
      }


  applyAll(){
    if(this.selectedField.type == 'income'){
       this._incomeParents.update((arr) => {
      const copy = [...arr];
      const p = copy[this.selectedField.parentIndex];

      p.items[this.selectedField.selectedIndex].values =  Array.from({ length: this.monthCount() }, () => signal(this.selectedField.selectedValue));
   
      return copy;
    });
    }else{
       this._expenseParents.update((arr) => {
      const copy = [...arr];
      const p = copy[this.selectedField.parentIndex];

      p.items[this.selectedField.selectedIndex].values =  Array.from({ length: this.monthCount() }, () => signal(this.selectedField.selectedValue));
   
      return copy;
    });
    }
  }

    // Optional: Hide context menu when clicking elsewhere
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
      if (this.showContextMenu) {
        this.showContextMenu = false;
      }
    }
}
