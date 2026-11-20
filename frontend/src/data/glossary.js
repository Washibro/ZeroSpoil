export const GLOSSARY_TERMS = {
  fefo: {
    category: "Shelf-Life Rotation",
    title: "FEFO Batches (First Expired, First Out)",
    easyWords:
      "Selling and shipping the crate that will spoil soonest before touching fresher crates in the back of the cold room.",
    dhakaWorkflow:
      "ZeroSpoil tracks every batch across Shwapno Dhanmondi 27, Agora Gulshan 2, Meena Bazar Uttara, and Unimart Banani against official USDA FoodKeeper shelf-life limits so older milk, produce, and poultry move to front chillers first.",
  },
  markdown: {
    category: "Revenue Recovery",
    title: "Dynamic Markdown",
    easyWords:
      "Automatically suggesting a smart 20% to 40% price cut a day or two before food spoils so shoppers buy it instead of throwing it away.",
    dhakaWorkflow:
      "When a batch drops under 48 hours of remaining shelf life and regular daily sales will not clear it, the Pricing Agent proposes a progressive discount that lifts sell-through above 90%—only taking effect after Kabir Hossain clicks Approve.",
  },
  benchmark: {
    category: "Verified Performance",
    title: "30% Waste Reduction Benchmark",
    easyWords:
      "A fair side-by-side 30-day test comparing old fixed daily deliveries (Policy A) against ZeroSpoil smart dispatch (Policy B).",
    dhakaWorkflow:
      "Across 10,000 kg of Dhaka perishable dispatches, ZeroSpoil cuts spoilage from 1,980 kg down to 1,210 kg—a verified 38.89% reduction that recovers BDT 486,200 in supplier revenue.",
  },
  rebalance: {
    category: "Smart Logistics",
    title: "Inter-Store Rebalancing",
    easyWords:
      "Moving extra crates from a quiet supermarket branch to a busy branch nearby before the food expires—only when the money saved beats the van cost.",
    dhakaWorkflow:
      "If Meena Bazar Uttara has excess mangoes while Unimart Banani is running out, the Rebalance Agent verifies that Salvage Revenue minus cold-chain shuttle cost is positive and that transit fits inside remaining shelf life.",
  },
  co2e: {
    category: "Climate Impact",
    title: "CO2e Avoided (UN FAOSTAT)",
    easyWords:
      "The amount of harmful greenhouse gas prevented by keeping fresh food on dinner tables instead of rotting in Dhaka landfills.",
    dhakaWorkflow:
      "Every kilogram of saved dairy (3.2x), poultry (4.5x), fish (3.8x), vegetables (1.4x), and fruits (0.8x) is multiplied by official United Nations FAOSTAT emission factors, totaling 1.92 tonnes of CO2e avoided in 30 days.",
  },
  vision: {
    category: "Optical Quality Control",
    title: "Vision Ripeness Scanner",
    easyWords:
      "Pointing a phone camera or uploading a crate photo to immediately measure how green, ripe, or spotted produce is.",
    dhakaWorkflow:
      "Warehouse staff scan crates using sub-10ms local color analysis (with optional Gemini multimodal review). If fruit reaches Stage 5 spotting, ZeroSpoil shortens the batch countdown and queues an urgent clearance discount.",
  },
  ask: {
    category: "Grounded Operations Assistant",
    title: "Ask ZeroSpoil",
    easyWords:
      "A supply-chain Q&A assistant that reads live store inventory numbers and official food storage rules before answering, so it never guesses.",
    dhakaWorkflow:
      "Every question queries live Dhaka supermarket stock through a strictly read-only inspection link and verifies storage temperature limits from USDA FoodKeeper guidelines, printing exact source citations with every answer.",
  },
  reconciliation: {
    category: "Stock Integrity",
    title: "Universal Inventory Reconciliation",
    easyWords:
      "Checking that Opening Stock plus Deliveries minus Sales, Waste, Returns, and Transfers equals what is physically sitting on the shelf.",
    dhakaWorkflow:
      "Instead of quietly hiding unlogged spoilage as zero waste, ZeroSpoil flags any Dhaka supermarket branch whose physical shelf count does not match its expected ledger balance.",
  },
  hitl: {
    category: "Operational Control",
    title: "Human-in-the-Loop Dispatch Approval",
    easyWords:
      "AI recommends what to ship, discount, or transfer, but the human logistics director always has the final Approve or Reject button.",
    dhakaWorkflow:
      "No reefer truck leaves the Dhaka hub and no supermarket shelf price changes until Kabir Hossain reviews the plain-language reasoning and confirms the directive.",
  },
};