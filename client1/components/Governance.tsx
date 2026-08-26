import React, { useEffect, useState, useCallback } from 'react';
import { useBns } from '../src/hooks/useBns';
import { useAccount } from '../src/starknet/StarknetProvider';
import { toast } from 'react-hot-toast';

const PARAM_NAMES: Record<number, string> = {
    1: 'Base Price',
    2: 'Auction Fee (BPS)',
    3: 'Grace Period (Sec)',
    4: 'Referral Bonus (BPS)'
};

const Governance: React.FC = () => {
    const { address } = useAccount();
    const { 
        getParamProposalCount, getParamProposal, getBasePrice, getTreasury,
        confirmParamChange, executeParamChange, proposeParamChange 
    } = useBns();

    const [basePrice, setBasePrice] = useState('0');
    const [treasury, setTreasury] = useState('0x0');
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [newParamId, setNewParamId] = useState(1);
    const [newValue, setNewValue] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const bp = await getBasePrice();
            setBasePrice(bp);
            
            const tr = await getTreasury();
            setTreasury(tr);

            const countStr = await getParamProposalCount();
            const count = parseInt(countStr);
            const props = [];
            for (let i = count; i > 0 && i > count - 10; i--) {
                const p = await getParamProposal(i.toString());
                if (p) props.push({ id: i, ...p });
            }
            setProposals(props);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [getBasePrice, getTreasury, getParamProposalCount, getParamProposal]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePropose = async () => {
        if (!newValue) return;
        const id = toast.loading("Creating proposal...");
        try {
            const val = BigInt(newValue);
            await proposeParamChange(newParamId, val);
            toast.success("Proposal created!", { id });
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Failed", { id });
        }
    };

    const handleConfirm = async (propId: number) => {
        const id = toast.loading("Confirming...");
        try {
            await confirmParamChange(propId.toString());
            toast.success("Confirmed!", { id });
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Failed", { id });
        }
    };

    const handleExecute = async (propId: number) => {
        const id = toast.loading("Executing...");
        try {
            await executeParamChange(propId.toString());
            toast.success("Executed!", { id });
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Failed", { id });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Current Params */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0D1117]/80 p-5 rounded-2xl border border-white/5">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Current Base Price</h3>
                    <p className="text-xl font-mono text-white truncate">{BigInt(basePrice).toString()} units</p>
                </div>
                <div className="bg-[#0D1117]/80 p-5 rounded-2xl border border-white/5">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Treasury Address</h3>
                    <p className="text-sm font-mono text-cyan-400 truncate">{treasury}</p>
                </div>
            </div>

            {/* Create Proposal */}
            <div className="bg-[#0D1117]/80 p-6 rounded-3xl border border-cyan-500/10">
                <h3 className="text-white font-bold mb-4">Create New Proposal</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <select 
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-cyan-500"
                        value={newParamId}
                        onChange={(e) => setNewParamId(Number(e.target.value))}
                    >
                        {Object.entries(PARAM_NAMES).map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                    <input 
                        className="flex-grow bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-cyan-500"
                        placeholder="New Value (u256)"
                        type="number"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                    />
                    <button 
                        onClick={handlePropose}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
                    >
                        Propose
                    </button>
                </div>
            </div>

            {/* Proposal List */}
            <div className="space-y-3">
                <h3 className="text-white font-bold px-2">Recent Proposals</h3>
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading proposals...</div>
                ) : proposals.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white/5 rounded-2xl">No active proposals</div>
                ) : (
                    proposals.map(p => (
                        <div key={p.id} className="bg-[#161B22] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-500">#{p.id}</span>
                                    <span className="text-white font-semibold">{PARAM_NAMES[p.paramId]}</span>
                                    {p.executed && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">EXECUTED</span>}
                                </div>
                                <p className="text-xs text-gray-400 font-mono">Value: {p.value.toString()}</p>
                                <p className="text-xs text-cyan-500 mt-1">Confirmations: {p.confirmations}</p>
                            </div>
                            <div className="flex gap-2">
                                {!p.executed && (
                                    <>
                                        <button 
                                            onClick={() => handleConfirm(p.id)}
                                            className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors"
                                        >
                                            Confirm
                                        </button>
                                        <button 
                                            onClick={() => handleExecute(p.id)}
                                            className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-xs font-bold text-cyan-400 transition-colors"
                                        >
                                            Execute
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Governance;
