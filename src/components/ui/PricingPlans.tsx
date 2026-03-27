import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getAllPlans, getFeaturesList, SubscriptionPlan } from '../../services/licensing';

interface PricingPlansProps {
  onSelectPlan: (planName: 'basic' | 'professional' | 'enterprise') => void;
  selectedPlan?: 'basic' | 'professional' | 'enterprise';
  showTrialBadge?: boolean;
}

export default function PricingPlans({ onSelectPlan, selectedPlan = 'basic', showTrialBadge = true }: PricingPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const allPlans = await getAllPlans();
      setPlans(allPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {plans.map((plan) => {
        const features = getFeaturesList(plan.name);
        const isPopular = plan.name === 'professional';
        const isSelected = selectedPlan === plan.name;

        return (
          <div
            key={plan.id}
            className={`relative rounded-2xl border-2 p-8 transition-all ${
              isSelected
                ? 'border-blue-500 shadow-xl scale-105'
                : isPopular
                ? 'border-blue-400 shadow-lg'
                : 'border-slate-700 hover:border-slate-600'
            } ${isPopular ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-slate-800'}`}
          >
            {isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-block px-6 py-2 bg-yellow-500 text-slate-900 text-sm font-bold rounded-full shadow-lg">
                  Más popular
                </span>
              </div>
            )}

            <div className="text-center mb-8">
              <h3 className={`text-2xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-white'}`}>
                {plan.display_name}
              </h3>

              <div className="mb-4">
                {plan.name === 'basic' && showTrialBadge && (
                  <p className="text-slate-300 text-sm">30 días de prueba</p>
                )}
                {plan.name === 'professional' && (
                  <div>
                    <span className={`text-5xl font-bold ${isPopular ? 'text-white' : 'text-white'}`}>
                      ${plan.price_monthly}
                    </span>
                    <span className={`${isPopular ? 'text-white/90' : 'text-slate-400'} text-lg`}>/mes</span>
                  </div>
                )}
                {plan.name === 'enterprise' && (
                  <p className={`text-xl font-semibold ${isPopular ? 'text-white' : 'text-slate-300'}`}>
                    Contactar ventas
                  </p>
                )}
              </div>

              {plan.name === 'basic' && (
                <p className={`text-3xl font-bold ${isPopular ? 'text-white' : 'text-white'}`}>Gratis</p>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    isPopular ? 'bg-white/20' : 'bg-blue-500/20'
                  }`}>
                    <Check className={`w-3 h-3 ${isPopular ? 'text-white' : 'text-blue-400'}`} />
                  </div>
                  <span className={`text-sm ${isPopular ? 'text-white/90' : 'text-slate-300'}`}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onSelectPlan(plan.name)}
              disabled={plan.name === 'enterprise'}
              className={`w-full py-4 px-6 rounded-xl font-bold transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : isPopular
                  ? 'bg-white text-blue-600 hover:bg-slate-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${plan.name === 'enterprise' ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isSelected
                ? 'Plan seleccionado'
                : plan.name === 'basic'
                ? 'Comenzar prueba'
                : plan.name === 'professional'
                ? 'Comenzar ahora'
                : 'Contactar'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
